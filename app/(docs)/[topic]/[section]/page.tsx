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
    'clone-install': () => import('../../../demo/content/getting-started/clone-and-install'),
    'env-setup': () => import('../../../demo/content/getting-started/env-setup'),
    'avatar-upload': () => import('../../../demo/content/getting-started/avatar-upload'),
    'logto-console': () => import('../../../demo/content/getting-started/logto-console'),
    'replace-the-demo': () => import('../../../demo/content/getting-started/replace-the-demo'),
  },
  'user-button': {
    'specs': () => import('../../../demo/content/user-button/specs'),
    'examples': () => import('../../../demo/content/user-button/examples'),
  },
  'dashboard': {
    'internals': () => import('../../../demo/content/dashboard/internals'),
    'provider-sync': () => import('../../../demo/content/dashboard/provider-sync'),
    'tab-structure': () => import('../../../demo/content/dashboard/tab-structure'),
    'rendering': () => import('../../../demo/content/dashboard/rendering'),
    'mobile': () => import('../../../demo/content/dashboard/mobile'),
  },
  'rbac': {
    'ui-protected': () => import('../../../demo/content/rbac/ui-protected'),
    'api': () => import('../../../demo/content/rbac/api'),
  },
  'calculator': {
    'overview': () => import('../../../demo/content/calculator/overview'),
    'rbac-design': () => import('../../../demo/content/calculator/rbac-design'),
    'api-authorization': () => import('../../../demo/content/calculator/api-authorization'),
    'live-demo': () => import('../../../demo/content/calculator/live-demo'),
  },
  'anatomy': {
    'providers': () => import('../../../demo/content/anatomy/providers'),
    'theme': () => import('../../../demo/content/anatomy/theme'),
    'i18n': () => import('../../../demo/content/anatomy/i18n'),
    'primitives': () => import('../../../demo/content/anatomy/primitives'),
  },
  'security': {
    'error-handling': () => import('../../../demo/content/security/error-handling'),
    'input-guards': () => import('../../../demo/content/security/input-guards'),
    'logging': () => import('../../../demo/content/security/logging'),
  },
  'tabs-and-flows': {
    'overview': () => import('../../../demo/content/tabs-and-flows/overview'),
    'profile': () => import('../../../demo/content/tabs-and-flows/profile'),
    'preferences': () => import('../../../demo/content/tabs-and-flows/preferences'),
    'security': () => import('../../../demo/content/tabs-and-flows/security'),
    'sessions': () => import('../../../demo/content/tabs-and-flows/sessions'),
    'identities': () => import('../../../demo/content/tabs-and-flows/identities'),
    'organizations': () => import('../../../demo/content/tabs-and-flows/organizations'),
    'dev': () => import('../../../demo/content/tabs-and-flows/dev'),
  },
};

const DOC_REGISTRY: Record<string, () => Promise<{ default: React.ComponentType }>> = {
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
