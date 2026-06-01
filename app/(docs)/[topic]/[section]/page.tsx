import { notFound } from 'next/navigation';
import ScrollToSection from './scroll-to-section';
import { NAV_ITEMS } from '../../../demo/nav-data';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// Export static params so Next.js statically builds all combinations of topic + section
export async function generateStaticParams() {
  const params: { topic: string; section: string }[] = [];
  for (const item of NAV_ITEMS) {
    for (const sec of item.sections) {
      params.push({
        topic: item.id,
        section: slugify(sec),
      });
    }
  }
  return params;
}

const CONTENT_REGISTRY: Record<string, Record<string, () => Promise<{ default: React.ComponentType }>>> = {
  'getting-started': {
    'pre-requisites': () => import('../../../demo/content/getting-started/pre-requisites'),
    'clone-and-install': () => import('../../../demo/content/getting-started/clone-and-install'),
    'env-setup': () => import('../../../demo/content/getting-started/env-setup'),
    'avatar-upload': () => import('../../../demo/content/getting-started/avatar-upload'),
    'logto-console': () => import('../../../demo/content/getting-started/logto-console'),
    'replace-the-demo': () => import('../../../demo/content/getting-started/replace-the-demo'),
  },
  'calculator': {
    'live-calculator': () => import('../../../demo/content/calculator/live-calculator'),
  }
};

const DOC_REGISTRY: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  'getting-started': () => import('../../../demo/docs/getting-started'),
  'user-button': () => import('../../../demo/docs/user-button'),
  'dashboard': () => import('../../../demo/docs/dashboard'),
  'tabs-and-flows': () => import('../../../demo/docs/tabs-and-flows'),
  'protected': () => import('../../../demo/docs/protected'),
  'org-switcher': () => import('../../../demo/docs/org-switcher'),
  'providers': () => import('../../../demo/docs/providers'),
  'theme': () => import('../../../demo/docs/themes'),
  'i18n': () => import('../../../demo/docs/i18n'),
  'sessions': () => import('../../../demo/docs/components/sessions'),
  'calculator': () => import('../../../demo/docs/components/calculator'),
  'errors': () => import('../../../demo/docs/errors'),
  'guards': () => import('../../../demo/docs/guards'),
  'logging': () => import('../../../demo/docs/logging'),
  'primitives': () => import('../../../demo/docs/primitives'),
};

interface PageProps {
  params: Promise<{
    topic: string;
    section: string;
  }>;
}

export default async function DocPage({ params }: PageProps) {
  const { topic, section } = await params;

  // Check if there is a standalone section component in CONTENT_REGISTRY
  const sectionLoader = CONTENT_REGISTRY[topic]?.[section];
  if (sectionLoader) {
    const SectionComponent = (await sectionLoader()).default;
    return (
      <div style={{ padding: '36px 44px 0' }}>
        <SectionComponent />
      </div>
    );
  }

  // Fallback to monolithic DOC_REGISTRY
  const loader = DOC_REGISTRY[topic];
  if (!loader) {
    notFound();
  }

  const DocComponent = (await loader()).default;

  return (
    <div style={{ padding: '36px 44px 0' }}>
      <DocComponent />
      <ScrollToSection section={section} />
    </div>
  );
}
