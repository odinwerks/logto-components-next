'use client';

import { useState, useEffect, useCallback } from 'react';
import { useThemeMode } from '../../logto-kit/components/handlers/preferences';
import { useOrgMode } from '../../logto-kit/components/handlers/preferences';
import { useLogto } from '../../logto-kit/components/handlers/logto-provider';
import { getFreshAccessToken } from '../../logto-kit/logic/actions';

interface CounterData {
  inflation: number;
  stolen: number;
  children: number;
}

export function PresidentControlPanelClient() {
  const { themeSpec } = useThemeMode();
  const { asOrg } = useOrgMode();
  const { accessToken, userData } = useLogto();

  // Initialize counters from sessionStorage or defaults
  const [counters, setCounters] = useState<CounterData>({
    inflation: 0,
    stolen: 0,
    children: 0,
  });

  // Load counters from sessionStorage on mount and org change
  useEffect(() => {
    const storageKey = `president-counters-${asOrg || 'global'}`;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        setCounters(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse stored counters:', error);
        setCounters({ inflation: 0, stolen: 0, children: 0 });
      }
    } else {
      setCounters({ inflation: 0, stolen: 0, children: 0 });
    }
  }, [asOrg]);

  // Save counters to sessionStorage whenever they change
  useEffect(() => {
    const storageKey = `president-counters-${asOrg || 'global'}`;
    sessionStorage.setItem(storageKey, JSON.stringify(counters));
  }, [counters, asOrg]);

  const handleAction = useCallback(async (action: string, counterKey: keyof CounterData) => {
    if (!userData?.id) {
      alert('Not authenticated');
      return;
    }

    try {
      // Get a fresh access token
      const freshToken = await getFreshAccessToken();

      const response = await fetch('/api/protected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: freshToken,
          id: userData.id,
          action,
          payload: { [counterKey]: counters[counterKey] },
        }),
      });

      const result = await response.json();

      if (result.ok && result.data) {
        setCounters(prev => ({
          ...prev,
          [counterKey]: result.data[counterKey],
        }));
      } else {
        console.error('Action failed:', result.error, result.message);
        alert(`Action failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Action error:', error);
      alert('Failed to execute action');
    }
  }, [counters, accessToken, userData]);

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
      {/* Decorative evil elements */}
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

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div style={{ textAlign: 'center' }}>
          <button
            style={evilButtonStyle}
            onClick={() => handleAction('destroy-economy', 'inflation')}
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
            onClick={() => handleAction('steal-tax-dollars', 'stolen')}
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
            onClick={() => handleAction('kidnap-children', 'children')}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 12px rgba(255, 0, 0, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 0, 0, 0.3)'}
          >
            😈 KIDNAP CHILDREN
          </button>
          <div style={counterStyle}>
            Basement Count: {counters.children}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: 'rgba(255, 0, 0, 0.1)',
        border: '1px solid #ff0000',
        borderRadius: '4px',
        textAlign: 'center',
        fontFamily: 'serif',
        fontSize: '0.9rem',
        color: '#ffcccc',
      }}>
        ⚠️ <strong>WARNING:</strong> These actions are for demonstration purposes only.
        In a real application, this would be extremely illegal and unethical.
      </div>
    </div>
  );
}
