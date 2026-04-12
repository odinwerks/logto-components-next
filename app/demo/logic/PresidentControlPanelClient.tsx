'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLogto } from '../../logto-kit/components/handlers/logto-provider';
import { getFreshAccessToken } from '../../logto-kit/logic/actions';

interface CounterData {
  inflation: number;
  stolen: number;
  children: number;
  launches: number;
}

const STORAGE_KEY = 'president-counters';

function loadCounters(): CounterData {
  if (typeof window === 'undefined') {
    return { inflation: 0, stolen: 0, children: 0, launches: 0 };
  }
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { inflation: 0, stolen: 0, children: 0, launches: 0 };
    }
  }
  return { inflation: 0, stolen: 0, children: 0, launches: 0 };
}

function saveCounters(counters: CounterData) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
  }
}

export function PresidentControlPanelClient() {
  const { userData } = useLogto();
  const [counters, setCounters] = useState<CounterData>(loadCounters);

  const handleAction = useCallback(async (action: string, payload: CounterData) => {
    if (!userData?.id) {
      console.error('Action failed: Not authenticated');
      alert('Not authenticated');
      return;
    }

    try {
      const freshToken = await getFreshAccessToken();

      const response = await fetch('/api/protected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: freshToken,
          id: userData.id,
          action,
          payload,
        }),
      });

      const result = await response.json();

      if (result.ok && result.data) {
        console.log(`✅ Action "${action}" succeeded: ${result.data.message}`);
        setCounters(prev => {
          const updated = { ...prev, ...result.data.data };
          saveCounters(updated);
          return updated;
        });
      } else {
        console.error(`❌ Action "${action}" failed: ${result.message}`);
        alert(`Action failed: ${result.message}`);
      }
    } catch (error) {
      console.error(`❌ Action "${action}" error:`, error);
      alert('Failed to execute action');
    }
  }, [userData]);

  const evilButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #2d1b1b 0%, #1a0f0f 100%)',
    border: '2px solid #ff0000',
    borderRadius: '8px',
    color: '#ffcccc',
    fontFamily: 'monospace',
    fontSize: '1rem',
    fontWeight: 'bold',
    padding: '12px 24px',
    cursor: 'pointer',
    boxShadow: '0 4px 8px rgba(255, 0, 0, 0.3)',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  };

  const evilPanelStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #1a0f0f 0%, #0d0808 100%)',
    border: '3px solid #8b0000',
    borderRadius: '12px',
    padding: '24px',
    margin: '20px 0',
    boxShadow: '0 8px 16px rgba(139, 0, 0, 0.4)',
    position: 'relative',
    overflow: 'hidden',
  };

  const evilTitleStyle: React.CSSProperties = {
    color: '#ff6666',
    fontFamily: 'serif',
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '20px',
    textShadow: '2px 2px 4px rgba(255, 0, 0, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  };

  const counterStyle: React.CSSProperties = {
    background: 'rgba(255, 0, 0, 0.1)',
    border: '1px solid #ff0000',
    borderRadius: '4px',
    padding: '8px 12px',
    margin: '8px 0',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    color: '#ffcccc',
    textAlign: 'center',
  };

  return (
    <div style={evilPanelStyle}>
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        width: '20px',
        height: '20px',
        background: '#ff0000',
        borderRadius: '50%',
        opacity: 0.7,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        width: '15px',
        height: '15px',
        background: '#8b0000',
        borderRadius: '50%',
        opacity: 0.5,
      }} />

      <h2 style={evilTitleStyle}>🗳️ EVIL PRESIDENT CONTROL PANEL 🗳️</h2>
      <p style={{ color: '#ffcccc', fontSize: '0.8rem', marginBottom: '16px', textAlign: 'center' }}>
        Demo RBAC: Only visible when active organization is "government"
      </p>

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div style={{ textAlign: 'center' }}>
          <button
            style={evilButtonStyle}
            onClick={() => handleAction('destroy-economy', counters)}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 12px rgba(255, 0, 0, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 0, 0, 0.3)'}
          >
            💸 DESTROY ECONOMY
          </button>
          <div style={counterStyle}>
            Inflation: {counters.inflation}%
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            style={evilButtonStyle}
            onClick={() => handleAction('steal-tax-dollars', counters)}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 12px rgba(255, 0, 0, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 0, 0, 0.3)'}
          >
            💰 STEAL TAX DOLLARS
          </button>
          <div style={counterStyle}>
            Stolen: ${counters.stolen.toLocaleString()}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            style={evilButtonStyle}
            onClick={() => handleAction('kidnap-children', counters)}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 12px rgba(255, 0, 0, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 0, 0, 0.3)'}
          >
            😈 KIDNAP CHILDREN
          </button>
          <div style={counterStyle}>
            Basement Count: {counters.children}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            style={evilButtonStyle}
            onClick={() => handleAction('launch-nuke', counters)}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 12px rgba(255, 0, 0, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 0, 0, 0.3)'}
          >
            ☢️ LAUNCH NUKE
          </button>
          <div style={counterStyle}>
            Nukes Launched: {counters.launches}
          </div>
        </div>
      </div>
    </div>
  );
}