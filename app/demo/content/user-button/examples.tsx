'use client';

import type { ReactNode } from 'react';
import { useIsPortrait } from '../../../logto-kit';
import { UserButton, UserBadge, UserCard } from '../../../logto-kit/components/UserButton';
import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';

interface ExampleCardProps {
  label: string;
  subLabel?: string;
  code: string;
  note?: string;
  isMobile: boolean;
  children: ReactNode;
}

function ExampleCard({ label, subLabel, code, note, isMobile, children }: ExampleCardProps) {
  const styles = useDocStyles();
  return (
    <div
      style={{
        ...styles.exampleCardStyle,
        flexDirection: isMobile ? 'column' : 'row',
      }}
    >
      <div
        style={{
          ...styles.exampleCodeStyle,
          borderRight: isMobile ? 'none' : styles.exampleCodeStyle.borderRight,
          borderBottom: isMobile ? '1px solid var(--ldd-border-color)' : 'none',
        }}
      >
        <div style={styles.exampleMetaStyle}>
          <span style={styles.exampleLabelStyle}>{label}</span>
          {subLabel && <span style={styles.exampleSubLabelStyle}>{subLabel}</span>}
          {note && (
            <span style={{
              marginLeft: 'auto',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '0.5rem',
              color: styles.textStyle.color,
              fontStyle: 'italic',
              whiteSpace: 'nowrap',
            }}>
              {note}
            </span>
          )}
        </div>
        <CodeBlock code={code} />
      </div>
      <div
        style={{
          ...styles.examplePreviewStyle,
          width: isMobile ? '100%' : styles.examplePreviewStyle.width,
          justifyContent: isMobile ? 'flex-start' : styles.examplePreviewStyle.justifyContent,
          padding: isMobile ? '10px 12px' : styles.examplePreviewStyle.padding,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function UserButtonExamples() {
  const isMobile = useIsPortrait();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
      <ExampleCard
        label="Default + sizes"
        subLabel="default 80px, 56px, and 36px"
        code={`<UserButton />            {/* default 6.25rem */}
<UserButton Size="56px" />
<UserButton Size="36px" />`}
        note="Sizes adjusted for clarity"
        isMobile={isMobile}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <UserButton Size="80px" />
          <UserButton Size="56px" />
          <UserButton Size="36px" />
        </div>
      </ExampleCard>

      <ExampleCard
        label="Shapes"
        subLabel="circle / square / rounded-sq"
        code={`<UserButton Size="56px" shape="circle" />
<UserButton Size="56px" shape="sq" />
<UserButton Size="56px" shape="rsq" />`}
        note="All three shapes for both components"
        isMobile={isMobile}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UserButton Size="56px" shape="circle" />
            <UserButton Size="56px" shape="sq" />
            <UserButton Size="56px" shape="rsq" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UserButton Size="56px" shape="circle" Canvas="Initials" />
            <UserButton Size="56px" shape="sq" Canvas="Initials" />
            <UserButton Size="56px" shape="rsq" Canvas="Initials" />
          </div>
        </div>
      </ExampleCard>

      <ExampleCard
        label="Canvas modes"
        subLabel="Avatar vs Initials"
        code={`<UserButton /> <UserButton Canvas="Initials" />
<UserBadge /> <UserBadge Canvas="Initials" />`}
        isMobile={isMobile}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserButton Size="56px" />
            <UserButton Size="56px" Canvas="Initials" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserBadge Size="56px" />
            <UserBadge Size="56px" Canvas="Initials" />
          </div>
        </div>
      </ExampleCard>

      <ExampleCard
        label="UserCard"
        subLabel="avatar + name + i18n label"
        code={`<UserCard Size="36px" shape="sq" />
<UserCard Size="36px" shape="rsq" />`}
        isMobile={isMobile}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}>
          <UserCard Size="36px" shape="sq" />
          <UserCard Size="36px" shape="rsq" />
        </div>
      </ExampleCard>

      <ExampleCard
        label="Custom click"
        subLabel="override default action"
        code={`const msg = 'User click handler triggered!';
<UserButton Size="72px" do={() => alert(msg)} />`}
        isMobile={isMobile}
      >
        <UserButton Size="72px" do={() => alert('User click handler triggered!')} />
      </ExampleCard>

      <ExampleCard
        label="do - open URL"
        subLabel="window.open in a new tab"
        code={`const url = 'https://github.com/odinwerks/logto';
<UserButton Size="72px" do={() => window.open(url, '_blank')} />`}
        isMobile={isMobile}
      >
        <UserButton Size="72px" do={() => window.open('https://github.com/odinwerks/logto', '_blank')} />
      </ExampleCard>
    </div>
  );
}
