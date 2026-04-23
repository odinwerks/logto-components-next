'use client';

import { useDocStyles } from './useDocStyles';

export function SectionHeader({ label }: { label: string }) {
  const styles = useDocStyles();
  return (
    <div style={styles.sectionHeadStyle}>
      <div style={styles.sectionDotStyle} />
      <span style={styles.sectionLabelStyle}>{label}</span>
    </div>
  );
}

export function SectionWrap({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const styles = useDocStyles();
  return (
    <div style={{ ...styles.sectionWrapStyle, ...style }}>
      <SectionHeader label={label} />
      <div style={{ ...styles.sectionBodyStyle, flex: 1 }}>{children}</div>
    </div>
  );
}
