'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, ArrowLeft, X } from 'lucide-react';
import { useThemeMode } from '../logto-kit';
import { UserButton } from '../logto-kit/components/UserButton';
import { NAV_ITEMS } from './nav-data';
import { slugify } from './components/SectionComponents';

export default function MobileDocsNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<'index' | 'topics' | 'sections'>('topics');
  const [selectedTopic, setSelectedTopic] = useState<typeof NAV_ITEMS[0] | null>(null);
  const { colors, mode } = useThemeMode();
  const router = useRouter();
  const isDark = mode === 'dark';

  useEffect(() => {
    if (stage === 'index') {
      router.push('/');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(false);
      setStage('topics');
    }
  }, [stage, router, setIsOpen]);

  // Guard: if the sections stage has no navigable items (selectedTopic is null or
  // its sections list is empty), fall back to the topics stage to avoid a dead end.
  useEffect(() => {
    if (stage === 'sections' && (!selectedTopic || selectedTopic.sections.length === 0)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage('topics');
    }
  }, [stage, selectedTopic]);

  const handleSectionClick = (topicId: string, section: string) => {
    router.push(`/${topicId}/${slugify(section)}`);
    setIsOpen(false);
  };

  // ─── STYLES ────────────────────────────────────────────────────────────────
  // The central trigger button style used by Hamburger, Close (X), and Back (ArrowLeft)
  const buttonResetStyle: React.CSSProperties = {
    appearance: 'none',
    WebkitAppearance: 'none',
    margin: 0,
    font: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    color: 'inherit',
    textAlign: 'inherit',
    background: 'none',
    border: 'none',
    outline: 'none',
  };

  const triggerStyle: React.CSSProperties = {
    ...buttonResetStyle,
    position: 'fixed',
    bottom: '1rem',
    right: '1rem',
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '0.625rem',
    border: `1px solid ${colors.borderColor}`,
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    backdropFilter: 'blur(0.5rem)',
    WebkitBackdropFilter: 'blur(0.5rem)',
    color: colors.textSecondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    zIndex: 1001, // High zIndex ensures it floats on top of the fullscreen overlay
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'all 0.15s ease',
  };

  const fullscreenOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: colors.bgPage,
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    minHeight: '100vh',
    animation: 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const stageContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    minHeight: 0,
  };

  const headerStyle: React.CSSProperties = {
    height: '52px',
    minHeight: '52px',
    borderBottom: `1px solid ${colors.borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // Title centered in header
    padding: '0 1.25rem',
    background: colors.bgSecondary,
  };

  const headerTitleStyle: React.CSSProperties = {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.textPrimary,
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    padding: '0.75rem 0 calc(4.75rem + env(safe-area-inset-bottom, 0px))',
  };

  const listInnerStyle: React.CSSProperties = {
    width: '100%',
    margin: 'auto 0',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // Center align text horizontally
    padding: '0.95rem 1rem',
    cursor: 'pointer',
    color: colors.textPrimary,
    transition: 'background 0.15s ease',
  };

  const itemLabelStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 500,
    fontFamily: 'inherit',
    textAlign: 'center',
  };

  const subItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // Center align subtopics horizontally
    padding: '0.95rem 1rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    color: colors.textSecondary,
    textAlign: 'center',
    transition: 'background 0.15s ease',
  } as React.CSSProperties;

  return (
    <>
      {/* Floating Hamburger Trigger (Only rendered if Nav is closed) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => { setIsOpen(true); setStage('topics'); }}
          style={triggerStyle}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
      )}

      {isOpen && (
        <div style={fullscreenOverlayStyle}>
          {stage === 'topics' ? (
            <div style={stageContainerStyle}>
              {/* Header */}
              <div style={headerStyle}>
                <span style={headerTitleStyle}>Documentation</span>
              </div>
              
              {/* Vertically Centered Topics List */}
              <div style={listStyle}>
                <div style={listInnerStyle}>
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setSelectedTopic(item); setStage('sections'); }}
                      style={{ ...buttonResetStyle, ...itemStyle, width: '100%', background: 'transparent' }}
                    >
                       <div style={itemLabelStyle}>{item.label}</div>
                     </button>
                   ))}
                </div>
              </div>

              {/* UserButton wrapper styled exactly to match the dimensions and alignment of the trigger */}
              <div style={{
                position: 'fixed',
                 bottom: '1rem',
                 right: '7.3rem',
                 width: '2.5rem',
                 height: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1001,
              }}>
                 <UserButton Size="2.5rem" shape="rsq" />
              </div>

              {/* Back button replacing X Close button */}
              {stage === 'topics' && (
                <button
                  type="button"
                  onClick={() => setStage('index')}  // Go back to index, not close
                  style={{ ...triggerStyle, right: '4.15rem' }}
                  aria-label="Back to homepage"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
            </div>
          ) : (
            <div style={stageContainerStyle}>
              {/* Header */}
              <div style={headerStyle}>
                <span style={headerTitleStyle}>{selectedTopic?.label}</span>
              </div>

              {/* Vertically Centered Subtopics List */}
              <div style={listStyle}>
                <div style={listInnerStyle}>
                  {selectedTopic?.sections.map((section) => (
                    <button
                      key={section}
                      type="button"
                      onClick={() => handleSectionClick(selectedTopic.id, section)}
                      style={{ ...buttonResetStyle, ...subItemStyle, width: '100%', background: 'transparent' }}
                    >
                      {section}
                    </button>
                  ))}
                </div>
              </div>

              {/* Back button positioned exactly where Hamburger/X is */}
              <button
                type="button"
                onClick={() => setStage('topics')}
                style={{ ...triggerStyle, right: '4.15rem' }}
                aria-label="Back to topics"
              >
                 <ArrowLeft size={18} />
              </button>
            </div>
          )}

          {/* Dedicated close button (X icon) that calls setIsOpen(false) without router.push('/') */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={triggerStyle}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}
