'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, ArrowLeft, ChevronRight, X } from 'lucide-react';
import { useThemeMode } from '../logto-kit';
import { UserButton } from '../logto-kit/components/UserButton';
import { NAV_ITEMS } from './nav-data';
import { slugify } from './components/SectionComponents';

export default function MobileDocsNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<'topics' | 'sections'>('topics');
  const [selectedTopic, setSelectedTopic] = useState<typeof NAV_ITEMS[0] | null>(null);
  const { colors, mode } = useThemeMode();
  const router = useRouter();
  const isDark = mode === 'dark';

  const handleSectionClick = (topicId: string, section: string) => {
    router.push(`/${topicId}/${slugify(section)}`);
    setIsOpen(false);
  };

  // ─── STYLES ────────────────────────────────────────────────────────────────
  // The central trigger button style used by Hamburger, Close (X), and Back (ArrowLeft)
  const triggerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.35rem',
    width: '3rem',
    height: '3rem',
    borderRadius: '0.75rem',
    border: `1px solid ${colors.borderColor}`,
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    backdropFilter: 'blur(0.5rem)',
    WebkitBackdropFilter: 'blur(0.5rem)',
    color: colors.textSecondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    height: '100vh',
    animation: 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const stageContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  };

  const headerStyle: React.CSSProperties = {
    height: '56px',
    minHeight: '56px',
    borderBottom: `1px solid ${colors.borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // Title centered in header
    padding: '0 1.25rem',
    background: colors.bgSecondary,
  };

  const headerTitleStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.textPrimary,
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center', // Vertically center alignment of list contents
    padding: '2rem 0',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // Center align text horizontally
    padding: '1.15rem 1.25rem',
    borderBottom: `1px solid ${colors.borderColor}50`,
    cursor: 'pointer',
    color: colors.textPrimary,
    transition: 'background 0.15s ease',
  };

  const itemLabelStyle: React.CSSProperties = {
    fontSize: '1.2rem',
    fontWeight: 500,
    textAlign: 'center',
  };

  const subItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // Center align subtopics horizontally
    padding: '1.15rem 1.25rem',
    borderBottom: `1px solid ${colors.borderColor}35`,
    cursor: 'pointer',
    fontSize: '1.1rem',
    color: colors.textSecondary,
    textAlign: 'center',
    transition: 'background 0.15s ease',
  } as React.CSSProperties;

  return (
    <>
      {/* Floating Hamburger Trigger (Only rendered if Nav is closed) */}
      {!isOpen && (
        <button onClick={() => { setIsOpen(true); setStage('topics'); }} style={triggerStyle}>
          <Menu size={22} />
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
                {NAV_ITEMS.map((item) => (
                  <div key={item.id} onClick={() => { setSelectedTopic(item); setStage('sections'); }} style={itemStyle}>
                    <div style={itemLabelStyle}>{item.label}</div>
                    <ChevronRight size={18} style={{ marginLeft: '0.5rem', color: colors.textTertiary }} />
                  </div>
                ))}
              </div>

              {/* UserButton wrapper styled exactly to match the dimensions and alignment of the trigger */}
              <div style={{
                position: 'fixed',
                bottom: '1.5rem',
                right: '5.35rem',
                width: '3rem',
                height: '3rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1001,
              }}>
                <UserButton Size="3rem" shape="rsq" />
              </div>

              {/* X Close button positioned exactly where Hamburger is */}
              <button onClick={() => setIsOpen(false)} style={triggerStyle}>
                <X size={22} />
              </button>
            </div>
          ) : (
            <div style={stageContainerStyle}>
              {/* Header */}
              <div style={headerStyle}>
                <span style={headerTitleStyle}>{selectedTopic?.label}</span>
              </div>

              {/* Vertically Centered Subtopics List */}
              <div style={listStyle}>
                {selectedTopic?.sections.map((section) => (
                  <div key={section} onClick={() => handleSectionClick(selectedTopic.id, section)} style={subItemStyle}>
                    {section}
                  </div>
                ))}
              </div>

              {/* Back button positioned exactly where Hamburger/X is */}
              <button onClick={() => setStage('topics')} style={triggerStyle}>
                <ArrowLeft size={22} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
