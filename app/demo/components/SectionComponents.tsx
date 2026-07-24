'use client';

import { useDocStyles } from './useDocStyles';
import { slugify } from '../../lib/slugify';

export { slugify };

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
    <div id={slugify(label)} style={{ ...styles.sectionWrapStyle, ...style }}>
      <SectionHeader label={label} />
      <div style={{ ...styles.sectionBodyStyle, flex: 1 }}>{children}</div>
    </div>
  );
}
