'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLogto } from '../../logto-kit/components/handlers/logto-provider';
import { getFreshAccessToken } from '../../logto-kit/logic/actions';

interface CalcState {
  expr: string;
  curToken: string;
  isRad: boolean;
  invOn: boolean;
  justEvaled: boolean;
  openParens: number;
  lastWasOp: boolean;
  lastWasClose: boolean;
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
      while (i < str.length && str[i] >= 'a' && str[i] <= 'z' && str[i] !== '(') {
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

function applyFunc(name: string, x: number, isRad: boolean): number {
  const toR = (v: number) => isRad ? v : v * (Math.PI / 180);
  const frR = (v: number) => isRad ? v : v * (180 / Math.PI);
  switch (name) {
    case 'sin': return Math.sin(toR(x));
    case 'cos': return Math.cos(toR(x));
    case 'tan': return Math.tan(toR(x));
    case 'asin': return frR(Math.asin(x));
    case 'acos': return frR(Math.acos(x));
    case 'atan': return frR(Math.atan(x));
    case 'ln': return Math.log(x);
    case 'log': return Math.log10(x);
    case 'log2': return Math.log2(x);
    case 'sqrt': return Math.sqrt(x);
    case 'fact': {
      const n = Math.round(x);
      if (n < 0 || n > 170) return NaN;
      let r = 1;
      for (let j = 2; j <= n; j++) r *= j;
      return r;
    }
    case 'abs': return Math.abs(x);
    case 'inv_x': return 1 / x;
    case 'exp10': return Math.pow(10, x);
    case 'exp': return Math.exp(x);
    default: return x;
  }
}

function evaluate(str: string, isRad: boolean): number {
  str = str.trim();
  if (str === '') return 0;
  const tokens = tokenize(str);
  if (!tokens) return NaN;
  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr(): number {
    return parseAddSub();
  }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (peek() === '+' || peek() === '-') {
      const op = consume() as string;
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv(): number {
    let left = parsePow();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume() as string;
      const right = parsePow();
      if (op === '*') left *= right;
      else if (op === '/') left /= right;
      else left = left - Math.floor(left / right) * right;
    }
    return left;
  }

  function parsePow(): number {
    const base = parseUnary();
    if (peek() === '^') {
      consume();
      const exp = parsePow();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === '-') {
      consume();
      return -parseUnary();
    }
    if (peek() === '+') {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const t = peek();
    if (t === undefined) return 0;

    if (typeof t === 'number') {
      consume();
      return t;
    }

    if (t === '(') {
      consume();
      const v = parseExpr();
      if (peek() === ')') consume();
      return v;
    }

    if (typeof t === 'string' && t.match(/^[a-z_]+$/)) {
      consume();
      if (peek() === '(') {
        consume();
        const arg = parseExpr();
        if (peek() === ')') consume();
        return applyFunc(t, arg, isRad);
      }
      return applyFunc(t, 0, isRad);
    }

    consume();
    return NaN;
  }

  try {
    return parseExpr();
  } catch {
    return NaN;
  }
}

export function CalculatorClient() {
  const { userData } = useLogto();
  const [state, setState] = useState<CalcState>(loadState);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const backspaceRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    saveState(state);
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

  const handleCalculate = useCallback(async (result: number) => {
    if (!userData?.id) {
      alert('Not authenticated');
      return;
    }

    try {
      const freshToken = await getFreshAccessToken();

      const hasScientific = /\b(sin|cos|tan|log|ln|sqrt|asin|acos|atan|log2|fact|abs|inv_x|exp10|exp)\b/.test(state.expr);
      const action = hasScientific ? 'calc-scientific' : 'calc-basic';

      const response = await fetch('/api/protected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: freshToken,
          id: userData.id,
          action,
          payload: { expression: state.expr, result },
        }),
      });

      const res = await response.json();

      if (res.ok && res.data) {
        console.log(`✅ Calculation succeeded: ${res.data.message}`);
      } else {
        console.error(`❌ Calculation failed: ${res.message}`);
        alert(`Permission denied: ${res.message}`);
      }
    } catch (error) {
      console.error('Failed to calculate:', error);
      alert('Failed to execute calculation');
    }
  }, [userData, state.expr]);

  const act = useCallback((a: string, data: string | null) => {
    setState(prev => {
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
          if (newState.curToken) {
            newState.expr += newState.curToken;
            newState.curToken = '';
          }
          while (newState.openParens > 0) {
            newState.expr += ')';
            newState.openParens--;
          }
          if (newState.expr === '') break;
          const result = evaluate(newState.expr, newState.isRad);
          const rs = fmtNum(result);
          const finalExpr = newState.expr;
          newState.expr = rs;
          newState.openParens = 0;
          newState.lastWasOp = false;
          newState.lastWasClose = false;
          newState.justEvaled = true;
          // Call API after state update completes
          setTimeout(() => handleCalculate(result), 0);
          break;
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
  }, [handleCalculate]);

  const getDisplayStr = useCallback(() => {
    if (state.curToken !== '') return state.curToken;
    if (state.expr === '') return '0';
    return state.expr;
  }, [state]);

  const mainDisplay = getDisplayStr();
  const exprDisplay = state.justEvaled ? '' : (state.expr + (state.curToken ? ' ' + state.curToken : ''));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') { act('digit', e.key); return; }
      if (e.key === '.') { act('dot', null); return; }
      if (e.key === '+') { act('op', '+'); return; }
      if (e.key === '-') { act('op', '-'); return; }
      if (e.key === '*') { act('op', '*'); return; }
      if (e.key === '/') { e.preventDefault(); act('op', '/'); return; }
      if (e.key === '%') { act('op', '%'); return; }
      if (e.key === '^') { act('fn', 'pow'); return; }
      if (e.key === 'Enter' || e.key === '=') { act('equals', null); return; }
      if (e.key === 'Backspace') { act('del', null); return; }
      if (e.key === 'Escape') { act('clear', null); return; }
      if (e.key === '(') { smartParen(); return; }
      if (e.key === ')') {
        flush();
        setState(prev => {
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
  }, [act, smartParen, flush]);

  const handleBackspaceMouseDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      act('clear', null);
    }, 500);
  };

  const handleBackspaceMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
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
    background: '#0e0e10',
    border: '1px solid #2a2a36',
    borderRadius: '4px',
    width: '340px',
    overflow: 'hidden',
    fontFamily: "'IBM Plex Sans', sans-serif",
  };

  const displayStyle: React.CSSProperties = {
    padding: '10px 18px 10px',
    background: '#16161a',
    borderBottom: '1px solid #2a2a36',
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
    color: '#4080ff',
    fontWeight: 500,
    letterSpacing: '0.1em',
    cursor: 'pointer',
  };

  const invLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: state.invOn ? '#e8a020' : '#444',
    fontWeight: 500,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'color 0.15s',
  };

  const exprLineStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '12px',
    color: '#606078',
    minHeight: '16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'right',
  };

  const mainLineStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: mainDisplay.length > 16 ? '16px' : mainDisplay.length > 11 ? '22px' : '34px',
    color: '#f0f0f5',
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
    color: drawerOpen ? '#4080ff' : '#444',
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
    background: '#1e1e24',
    color: '#f0f0f5',
    border: '1px solid #2a2a36',
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

  const fnBtnStyle: React.CSSProperties = { ...btnStyle, fontSize: '12.5px', background: '#16161a' };
  const eqBtnStyle: React.CSSProperties = { ...btnStyle, fontSize: '18px' };

  return (
    <div style={calcWrapperStyle}>
      <div style={displayStyle}>
        <div style={modeRowStyle}>
          <div style={modeLabelStyle} onClick={() => act('toggleMode', null)}>
            {state.isRad ? 'RAD' : 'DEG'}
          </div>
          <div style={invLabelStyle} onClick={() => act('inv', null)}>INV</div>
        </div>
        <div style={exprLineStyle}>{exprDisplay}</div>
        <div style={mainLineStyle}>{mainDisplay}</div>
        <div style={fxLabelStyle} onClick={() => setDrawerOpen(!drawerOpen)}>f(x)</div>
      </div>
      <div style={buttonsStyle}>
        <div style={drawerStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '4px' }}>
            <div style={row5Style}>
              <button style={fnBtnStyle} onClick={() => act('toggleMode', null)}>{state.isRad ? 'RAD' : 'DEG'}</button>
              <button style={fnBtnStyle} onClick={() => act('inv', null)}>INV</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'pi')}>π</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'e_const')}>e</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'abs')}>|x|</button>
            </div>
            <div style={row5Style}>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('sin'))}>{getFuncLabel('sin')}</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('cos'))}>{getFuncLabel('cos')}</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('tan'))}>{getFuncLabel('tan')}</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'ln')}>ln</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'log')}>log</button>
            </div>
            <div style={row5Style}>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('asin'))}>{getFuncLabel('asin')}</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('acos'))}>{getFuncLabel('acos')}</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', getFuncLabel('atan'))}>{getFuncLabel('atan')}</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'log2')}>log₂</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'sqrt')}>√x</button>
            </div>
            <div style={row5Style}>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'pow')}>xʸ</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'fact')}>n!</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'inv_x')}>1/x</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'exp10')}>10ˣ</button>
              <button style={{ ...fnBtnStyle, height: '40px' }} onClick={() => act('fn', 'exp')}>eˣ</button>
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
            <button style={eqBtnStyle} onClick={() => act('equals', null)}>=</button>
          </div>
        </div>
      </div>
    </div>
  );
}
