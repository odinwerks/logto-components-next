import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  code: boolean;
  type: string;
  icon: React.ReactNode;
  desc: string;
  sections: string[];
}

export interface SectionHint {
  [key: string]: string;
}
