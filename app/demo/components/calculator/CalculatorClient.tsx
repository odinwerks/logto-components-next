'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useOrgMode, useUserDataContext } from '../../../logto-kit';
import { loadOrganizationPermissions } from '../../../logto-kit/server-actions';

interface CalcState {
  expr: string;
  curToken: string;
  isRad: boolean;
  invOn: boolean;
  justEvaled: boolean;
  openParens: number;
  lastWasOp: boolean;
  lastWasClose: boolean;
  isCalculating: boolean;
}

const STORAGE_KEY = 'calc-state';

const DEFAULT_STATE: CalcState = {
  expr: '',
  curToken: '',
  isRad: false,
  invOn: false,
  justEvaled: false,
  openParens: 0,
  lastWasOp: true,
  lastWasClose: false,
  isCalculating: false,
};

function loadState(): CalcState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_STATE;
    }
  }
  return DEFAULT_STATE;
}

function saveState(state: CalcState) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function fmtNum(n: number): string {
  if (!isFinite(n)) return isNaN(n) ? 'Error' : n > 0 ? 'Infinity' : '-Infinity';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e13 || abs < 1e-9) return n.toPrecision(9).replace(/\.?0+$/, '');
  return parseFloat(n.toPrecision(12)).toString();
}

// ============================================================================
// Tokenizer
// ============================================================================

function tokenize(str: string): (string | number)[] | null {
  const toks: (string | number)[] = [];
  let i = 0;
  str = str.replace(/\s+/g, '');
  while (i < str.length) {
    const c = str[i];
    if ((c >= '0' && c <= '9') || c === '.') {
      let n = '';
      while (i < str.length && ((str[i] >= '0' && str[i] <= '9') || str[i] === '.')) {
        n += str[i++];
      }
      toks.push(parseFloat(n));
      continue;
    }
    if (c === '-') {
      const last = toks[toks.length - 1];
      if (last === undefined || last === '(' || ['+', '-', '*', '/', '%', '^'].includes(last as string)) {
        toks.push('-');
        i++;
        continue;
      }
    }
    if ('+-*/%^()'.includes(c)) {
      toks.push(c);
      i++;
      continue;
    }
    if (c >= 'a' && c <= 'z') {
      let name = '';
      while (i < str.length && ((str[i] >= 'a' && str[i] <= 'z') || (str[i] >= '0' && str[i] <= '9') || str[i] === '_') && str[i] !== '(') {
        name += str[i++];
      }
      const last = toks[toks.length - 1];
      if (typeof last === 'number' || last === ')') {
        toks.push('*');
      }
      toks.push(name);
      continue;
    }
    i++;
  }
  return toks;
}

// ============================================================================
// Expression Tree
// ============================================================================

type ExprNode =
  | { type: 'num'; value: number }
  | { type: 'binop'; op: string; left: ExprNode; right: ExprNode }
  | { type: 'unary'; op: string; arg: ExprNode }
  | { type: 'func'; name: string; arg: ExprNode };

function parseExpr(tokens: (string | number)[]): ExprNode {
  return parseAddSub(tokens);
}

function parseAddSub(tokens: (string | number)[]): ExprNode {
  let left = parseMulDiv(tokens);
  while (peek(tokens) === '+' || peek(tokens) === '-') {
    const op = consume(tokens) as string;
    const right = parseMulDiv(tokens);
    left = { type: 'binop', op, left, right };
  }
  return left;
}

function parseMulDiv(tokens: (string | number)[]): ExprNode {
  let left = parsePow(tokens);
  while (peek(tokens) === '*' || peek(tokens) === '/' || peek(tokens) === '%') {
    const op = consume(tokens) as string;
    const right = parsePow(tokens);
    left = { type: 'binop', op, left, right };
  }
  return left;
}

function parsePow(tokens: (string | number)[]): ExprNode {
  const base = parseUnary(tokens);
  if (peek(tokens) === '^') {
    consume(tokens);
    const exp = parsePow(tokens);
    return { type: 'binop', op: '^', left: base, right: exp };
  }
  return base;
}

function parseUnary(tokens: (string | number)[]): ExprNode {
  if (peek(tokens) === '-') {
    consume(tokens);
    return { type: 'unary', op: '-', arg: parseUnary(tokens) };
  }
  if (peek(tokens) === '+') {
    consume(tokens);
    return parseUnary(tokens);
  }
  return parsePrimary(tokens);
}

function parsePrimary(tokens: (string | number)[]): ExprNode {
  const t = peek(tokens);
  if (t === undefined) return { type: 'num', value: 0 };

  if (typeof t === 'number') {
    consume(tokens);
    return { type: 'num', value: t };
  }

  if (t === '(') {
    consume(tokens);
    const v = parseExpr(tokens);
    if (peek(tokens) === ')') consume(tokens);
    return v;
  }

  if (typeof t === 'string' && t.match(/^[a-z_]+$/)) {
    consume(tokens);
    if (peek(tokens) === '(') {
      consume(tokens);
      const arg = parseExpr(tokens);
      if (peek(tokens) === ')') consume(tokens);
      return { type: 'func', name: t, arg };
    }
    return { type: 'func', name: t, arg: { type: 'num', value: 0 } };
  }

  consume(tokens);
  return { type: 'num', value: NaN };
}

let _pos = 0;
function peek(tokens: (string | number)[]) {
  return tokens[_pos];
}
function consume(tokens: (string | number)[]) {
  return tokens[_pos++];
}

// ============================================================================
// API-calling evaluator
// ============================================================================

const OP_TO_ACTION: Record<string, string> = {
  '+': 'calc/add',
  '-': 'calc/subtract',
  '*': 'calc/multiply',
  '/': 'calc/divide',
  '%': 'calc/modulo',
  '^': 'calc/power',
};

const FUNC_TO_ACTION: Record<string, string> = {
  sin: 'calc/sin',
  cos: 'calc/cos',
  tan: 'calc/tan',
  asin: 'calc/asin',
  acos: 'calc/acos',
  atan: 'calc/atan',
  ln: 'calc/ln',
  log: 'calc/log',
  log2: 'calc/log2',
  sqrt: 'calc/sqrt',
  fact: 'calc/fact',
  abs: 'calc/abs',
  inv_x: 'calc/inv',
  exp10: 'calc/exp10',
  exp: 'calc/exp',
};

async function callProtectedAction(action: string, payload: unknown): Promise<number> {
  const res = await fetch('/api/protected', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
  return json.data.answer;
}

async function evalNode(node: ExprNode, isRad: boolean): Promise<number> {
  switch (node.type) {
    case 'num':
      return node.value;
    case 'unary':
      return -(await evalNode(node.arg, isRad));
    case 'binop': {
      const left = await evalNode(node.left, isRad);
      const right = await evalNode(node.right, isRad);
      return await callProtectedAction(OP_TO_ACTION[node.op], { a: left, b: right });
    }
    case 'func': {
      const arg = await evalNode(node.arg, isRad);
      const isTrig = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].includes(node.name);
      if (isTrig) {
        return await callProtectedAction(FUNC_TO_ACTION[node.name], { n: arg, mode: isRad ? 'rad' : 'deg' });
      }
      return await callProtectedAction(FUNC_TO_ACTION[node.name], { n: arg });
    }
  }
}

// ============================================================================
// Component
// ============================================================================

export function CalculatorClient() {
  const [state, setState] = useState<CalcState>(DEFAULT_STATE);
  const isLoadedRef = useRef(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const backspaceRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const lastTouchTimeRef = useRef<number>(0);

  useEffect(() => {
    const loaded = loadState();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loaded);
    isLoadedRef.current = true;
  }, []);

  const { asOrg } = useOrgMode();
  const userData = useUserDataContext();
  const [hasScientific, setHasScientific] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userData) {
      // Intentional synchronous reset: must clear stale permission before UI
      // re-renders. See .orch-artifacts/plan/CalculatorClient.tsx.md
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasScientific(false);
      return;
    }
    const targetOrgId = asOrg || '5b6sw6p5uzti';
    let cancelled = false;
    loadOrganizationPermissions(targetOrgId)
      .then((r) => {
        if (!cancelled) {
          if (r.ok && r.data.includes('calc:scientific')) {
            setHasScientific(true);
          } else {
            setHasScientific(false);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasScientific(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userData, asOrg]);

  const isScientificDisabled = hasScientific === false;

  useEffect(() => {
    if (isLoadedRef.current) {
      saveState(state);
    }
  }, [state]);

  const flush = useCallback(() => {
    setState(prev => {
      if (prev.curToken === '') return prev;
      return {
        ...prev,
        expr: prev.expr + prev.curToken,
        curToken: '',
        lastWasOp: false,
        lastWasClose: false,
      };
    });
  }, []);

  const smartParen = useCallback(() => {
    flush();
    setState(prev => {
      if (prev.openParens > 0 && !prev.lastWasOp) {
        return {
          ...prev,
          expr: prev.expr + ')',
          openParens: prev.openParens - 1,
          lastWasOp: false,
          lastWasClose: true,
        };
      } else {
        const needsMultiply = !prev.lastWasOp && !prev.lastWasClose && prev.expr !== '';
        return {
          ...prev,
          expr: prev.expr + (needsMultiply ? '*' : '') + '(',
          openParens: prev.openParens + 1,
          lastWasOp: true,
          lastWasClose: false,
        };
      }
    });
  }, [flush]);

  const handleEquals = useCallback(async () => {
    let exprToEval = state.expr + (state.curToken || '');
    const radMode = state.isRad;
    let parens = state.openParens;
    while (parens > 0) {
      exprToEval += ')';
      parens--;
    }

    if (!exprToEval) {
      return;
    }

    setState(prev => ({
      ...prev,
      expr: exprToEval,
      curToken: '',
      openParens: 0,
      isCalculating: true,
    }));

    try {
      _pos = 0;
      const tokens = tokenize(exprToEval);
      if (!tokens) throw new Error('Invalid expression');
      const tree = parseExpr(tokens);
      const result = await evalNode(tree, radMode);
      const rs = fmtNum(result);

      setState(prev => ({
        ...prev,
        expr: rs,
        isCalculating: false,
        justEvaled: true,
        lastWasOp: false,
        lastWasClose: false,
      }));
    } catch (err) {
      console.error('Calculation failed:', err);
      setState(prev => ({
        ...prev,
        expr: 'Error',
        isCalculating: false,
        justEvaled: true,
      }));
    }
  }, [state.expr, state.curToken, state.isRad, state.openParens]);

  const act = useCallback((a: string, data: string | null) => {
    setState(prev => {
      if (prev.isCalculating) return prev;

      let newState = { ...prev };

      if (newState.justEvaled && a === 'digit') {
        newState = {
          ...DEFAULT_STATE,
          isRad: newState.isRad,
          invOn: newState.invOn,
        };
      }
      if (newState.justEvaled && a === 'op') {
        newState.justEvaled = false;
      }

      switch (a) {
        case 'digit': {
          if (newState.curToken === '0' && data !== '.') {
            newState.curToken = data || '';
          } else if (newState.curToken.length < 16) {
            newState.curToken += data || '';
          }
          newState.lastWasOp = false;
          newState.lastWasClose = false;
          break;
        }
        case 'dot': {
          if (!newState.curToken.includes('.')) {
            newState.curToken += (newState.curToken ? '' : '0') + '.';
          }
          break;
        }
        case 'op': {
          if (newState.curToken) {
            newState.expr += newState.curToken;
            newState.curToken = '';
          }
          if (newState.lastWasOp && newState.expr.length > 0) {
            const ops = '+-*/%';
            const last = newState.expr[newState.expr.length - 1];
            if (ops.includes(last)) {
              newState.expr = newState.expr.slice(0, -1);
            }
          }
          newState.expr += data;
          newState.lastWasOp = true;
          newState.lastWasClose = false;
          break;
        }
        case 'smartParen':
          return prev;
        case 'del': {
          if (newState.justEvaled) {
            newState = { ...DEFAULT_STATE, isRad: newState.isRad, invOn: newState.invOn };
            break;
          }
          if (newState.curToken) {
            newState.curToken = newState.curToken.slice(0, -1);
          } else if (newState.expr) {
            const last = newState.expr[newState.expr.length - 1];
            if (last === '(') newState.openParens--;
            if (last === ')') newState.openParens++;
            newState.expr = newState.expr.slice(0, -1);
            const newLast = newState.expr[newState.expr.length - 1];
            newState.lastWasOp = !newLast || '+-*/%^('.includes(newLast);
            newState.lastWasClose = newLast === ')';
          }
          break;
        }
        case 'clear': {
          newState = { ...DEFAULT_STATE, isRad: newState.isRad, invOn: newState.invOn };
          break;
        }
        case 'equals': {
          return prev; // handled by handleEquals
        }
        case 'fn': {
          const f = data;
          if (f === 'pi') {
            if (newState.curToken) {
              newState.expr += newState.curToken;
              newState.curToken = '';
            }
            if (!newState.lastWasOp && newState.expr) newState.expr += '*';
            newState.expr += '3.14159265358979';
            newState.lastWasOp = false;
          } else if (f === 'e_const') {
            if (newState.curToken) {
              newState.expr += newState.curToken;
              newState.curToken = '';
            }
            if (!newState.lastWasOp && newState.expr) newState.expr += '*';
            newState.expr += '2.71828182845905';
            newState.lastWasOp = false;
          } else if (f === 'pow') {
            if (newState.curToken) {
              newState.expr += newState.curToken;
              newState.curToken = '';
            }
            newState.expr += '^';
            newState.lastWasOp = true;
          } else {
            if (newState.curToken) {
              newState.expr += newState.curToken;
              newState.curToken = '';
            }
            if (!newState.lastWasOp && newState.expr) newState.expr += '*';
            newState.expr += f + '(';
            newState.openParens++;
            newState.lastWasOp = true;
            newState.lastWasClose = false;
          }
          break;
        }
        case 'inv': {
          newState.invOn = !newState.invOn;
          break;
        }
        case 'toggleMode': {
          newState.isRad = !newState.isRad;
          break;
        }
      }
      return newState;
    });
  }, []);

  const mainDisplay = useMemo(() => {
    if (state.isCalculating) return '...';
    if (state.curToken !== '') return state.curToken;
    if (state.expr === '') return '0';
    return state.expr;
  }, [state.isCalculating, state.curToken, state.expr]);

  const exprDisplay = state.justEvaled ? '' : (state.expr + (state.curToken ? ' ' + state.curToken : ''));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack keystrokes when the user is typing in an input field
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) return;
      if (state.isCalculating) return;
      if (e.key >= '0' && e.key <= '9') { act('digit', e.key); return; }
      if (e.key === '.') { act('dot', null); return; }
      if (e.key === '+') { act('op', '+'); return; }
      if (e.key === '-') { act('op', '-'); return; }
      if (e.key === '*') { act('op', '*'); return; }
      if (e.key === '/') { e.preventDefault(); act('op', '/'); return; }
      if (e.key === '%') { act('op', '%'); return; }
      if (e.key === '^') {
        if (!isScientificDisabled) act('fn', 'pow');
        return;
      }
      if (e.key === 'Enter' || e.key === '=') { handleEquals(); return; }
      if (e.key === 'Backspace') { act('del', null); return; }
      if (e.key === 'Escape') { act('clear', null); return; }
      if (e.key === '(') { smartParen(); return; }
      if (e.key === ')') {
        flush();
        setState(prev => {
          if (prev.isCalculating) return prev;
          if (prev.openParens > 0) {
            return {
              ...prev,
              expr: prev.expr + ')',
              openParens: prev.openParens - 1,
              lastWasOp: false,
              lastWasClose: true,
            };
          }
          return prev;
        });
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [act, smartParen, flush, handleEquals, state.isCalculating, isScientificDisabled]);

  const handleBackspaceMouseDown = (e?: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (e && 'touches' in e) {
      e.preventDefault();
      lastTouchTimeRef.current = now;
    } else if (now - lastTouchTimeRef.current < 1000) {
      return;
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      act('clear', null);
    }, 500);
  };

  const handleBackspaceMouseUp = (e?: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (e && 'touches' in e) {
      e.preventDefault();
      lastTouchTimeRef.current = now;
    } else if (now - lastTouchTimeRef.current < 1000) {
      return;
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      act('del', null);
    }
  };

  const getFuncLabel = (f: string): string => {
    if (!state.invOn) return f;
    const swaps: Record<string, string> = { sin: 'asin', cos: 'acos', tan: 'atan', asin: 'sin', acos: 'cos', atan: 'tan' };
    return swaps[f] || f;
  };

  const calcWrapperStyle: React.CSSProperties = {
    background: 'var(--ldd-bg-primary)',
    border: '1px solid var(--ldd-border-color)',
    borderRadius: '4px',
    width: '340px',
    overflow: 'hidden',
    fontFamily: "'IBM Plex Sans', sans-serif",
  };

  const displayStyle: React.CSSProperties = {
    padding: '10px 18px 10px',
    background: 'var(--ldd-bg-secondary)',
    borderBottom: '1px solid var(--ldd-border-color)',
    minHeight: '100px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    position: 'relative',
  };

  const modeRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  };

  const modeLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--ldd-accent-blue)',
    fontWeight: 500,
    letterSpacing: '0.1em',
    cursor: 'pointer',
  };

  const invLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: state.invOn ? 'var(--ldd-accent-yellow)' : 'var(--ldd-text-tertiary)',
    fontWeight: 500,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'color 0.15s',
  };

  const exprLineStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '12px',
    color: 'var(--ldd-text-tertiary)',
    minHeight: '16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'right',
  };

  const mainLineStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: mainDisplay.length > 16 ? '16px' : mainDisplay.length > 11 ? '22px' : '34px',
    color: 'var(--ldd-text-primary)',
    textAlign: 'right',
    marginTop: '3px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 400,
    transition: 'font-size 0.1s',
  };

  const fxLabelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '8px',
    left: '18px',
    fontSize: '11px',
    color: drawerOpen ? 'var(--ldd-accent-blue)' : 'var(--ldd-text-tertiary)',
    fontWeight: 500,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'color 0.15s',
  };

  const buttonsStyle: React.CSSProperties = {
    padding: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    height: '408px',
  };

  const mainButtonsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minHeight: 0,
  };

  const drawerStyle: React.CSSProperties = {
    overflow: 'hidden',
    maxHeight: drawerOpen ? '176px' : '0',
    opacity: drawerOpen ? 1 : 0,
    transition: 'max-height 0.25s ease, opacity 0.2s ease',
    flexShrink: 0,
  };

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gap: '4px',
    flex: 1,
    minHeight: '40px',
  };

  const row5Style: React.CSSProperties = { ...rowStyle, gridTemplateColumns: 'repeat(5, 1fr)', flex: 'none', height: '40px', minHeight: 0 };
  const row4Style: React.CSSProperties = { ...rowStyle, gridTemplateColumns: 'repeat(4, 1fr)' };

  const btnStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '17px',
    fontWeight: 500,
    background: 'var(--ldd-bg-tertiary)',
    color: 'var(--ldd-text-primary)',
    border: '1px solid var(--ldd-border-color)',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'background 0.07s, transform 0.06s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    letterSpacing: '0.01em',
  };

  const fnBtnStyle: React.CSSProperties = { ...btnStyle, fontSize: '12.5px', background: 'var(--ldd-bg-secondary)' };
  const sciBtnStyle: React.CSSProperties = {
    ...fnBtnStyle,
    opacity: isScientificDisabled ? 0.4 : 1,
    cursor: isScientificDisabled ? 'not-allowed' : 'pointer',
  };
  const eqBtnStyle: React.CSSProperties = { ...btnStyle, fontSize: '18px' };

  return (
    <div style={calcWrapperStyle}>
        <div style={displayStyle}>
          <div style={modeRowStyle}>
          <button
            type="button"
            style={{ ...modeLabelStyle, border: 'none', background: 'transparent' }}
            onClick={() => act('toggleMode', null)}
          >
            {state.isRad ? 'RAD' : 'DEG'}
          </button>
          <button
            type="button"
            style={{ ...invLabelStyle, border: 'none', background: 'transparent' }}
            onClick={() => act('inv', null)}
          >
            INV
          </button>
          </div>
          <div style={exprLineStyle}>{exprDisplay}</div>
          <div style={mainLineStyle}>{mainDisplay}</div>
        <button
          type="button"
          style={{ ...fxLabelStyle, border: 'none', background: 'transparent' }}
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          f(x)
        </button>
        </div>
      <div style={buttonsStyle}>
        <div style={drawerStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '4px' }}>
            <div style={row5Style}>
              <button style={fnBtnStyle} onClick={() => act('toggleMode', null)}>{state.isRad ? 'RAD' : 'DEG'}</button>
              <button style={fnBtnStyle} onClick={() => act('inv', null)}>INV</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'pi')}>π</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'e_const')}>e</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'abs')}>|x|</button>
            </div>
            <div style={row5Style}>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('sin'))}>{getFuncLabel('sin')}</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('cos'))}>{getFuncLabel('cos')}</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('tan'))}>{getFuncLabel('tan')}</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'ln')}>ln</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'log')}>log</button>
            </div>
            <div style={row5Style}>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('asin'))}>{getFuncLabel('asin')}</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('acos'))}>{getFuncLabel('acos')}</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('atan'))}>{getFuncLabel('atan')}</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'log2')}>log₂</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'sqrt')}>√x</button>
            </div>
            <div style={row5Style}>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'pow')}>xʸ</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'fact')}>n!</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'inv_x')}>1/x</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'exp10')}>10ˣ</button>
              <button disabled={isScientificDisabled} style={{ ...sciBtnStyle, height: '40px' }} onClick={() => act('fn', 'exp')}>eˣ</button>
            </div>
          </div>
        </div>
        <div style={mainButtonsStyle}>
          <div style={row4Style}>
            <button style={btnStyle} onClick={smartParen}>( )</button>
            <button style={btnStyle} onClick={() => act('op', '%')}>%</button>
            <button style={btnStyle} onClick={() => act('op', '+')}>+</button>
            <button style={btnStyle} onClick={() => act('op', '-')}>−</button>
          </div>
          <div style={row4Style}>
            <button style={btnStyle} onClick={() => act('digit', '7')}>7</button>
            <button style={btnStyle} onClick={() => act('digit', '8')}>8</button>
            <button style={btnStyle} onClick={() => act('digit', '9')}>9</button>
            <button style={btnStyle} onClick={() => act('op', '/')}>÷</button>
          </div>
          <div style={row4Style}>
            <button style={btnStyle} onClick={() => act('digit', '4')}>4</button>
            <button style={btnStyle} onClick={() => act('digit', '5')}>5</button>
            <button style={btnStyle} onClick={() => act('digit', '6')}>6</button>
            <button style={btnStyle} onClick={() => act('op', '*')}>×</button>
          </div>
          <div style={row4Style}>
            <button style={btnStyle} onClick={() => act('digit', '1')}>1</button>
            <button style={btnStyle} onClick={() => act('digit', '2')}>2</button>
            <button style={btnStyle} onClick={() => act('digit', '3')}>3</button>
            <button
              ref={backspaceRef}
              style={btnStyle}
              onMouseDown={handleBackspaceMouseDown}
              onMouseUp={handleBackspaceMouseUp}
              onMouseLeave={() => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
              onTouchStart={handleBackspaceMouseDown}
              onTouchEnd={handleBackspaceMouseUp}
            >⌫</button>
          </div>
          <div style={row4Style}>
            <button style={{ ...btnStyle, gridColumn: 'span 2' }} onClick={() => act('digit', '0')}>0</button>
            <button style={btnStyle} onClick={() => act('dot', null)}>.</button>
            <button style={eqBtnStyle} onClick={() => { if (!state.isCalculating) handleEquals(); }}>=</button>
          </div>
        </div>
      </div>
    </div>
  );
}
