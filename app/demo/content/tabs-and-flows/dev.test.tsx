import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), relativePath), 'utf8');

const aliases = ['developer', 'pat', 'pats', 'pat-tokens', 'tokens'] as const;

const defaultTabValue = (source: string, name: 'LOAD_TABS' | 'NEXT_PUBLIC_LOAD_TABS'): string => {
  const match = source.match(new RegExp(`^${name}=(.*)$`, 'm'));
  expect(match, `${name} assignment`).not.toBeNull();
  return match?.[1] ?? '';
};

const indentedBlock = (source: string, key: string, indentation: number): string => {
  const lines = source.split('\n');
  const header = `${' '.repeat(indentation)}${key}:`;
  const start = lines.findIndex((line) => line === header);
  expect(start, `${key} block`).toBeGreaterThanOrEqual(0);

  const end = lines.findIndex((line, index) => {
    if (index <= start || line.trim() === '') return false;
    const leadingSpaces = line.length - line.trimStart().length;
    return leadingSpaces <= indentation;
  });

  return lines.slice(start, end === -1 ? undefined : end).join('\n');
};

const markdownBulletList = (source: string, introduction: string): string => {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line === introduction);
  expect(start, `${introduction} list`).toBeGreaterThanOrEqual(0);

  const end = lines.findIndex((line, index) => index > start && !line.startsWith('- '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
};

describe('Dev/PAT documentation consistency', () => {
  it('keeps the environment template private, default-off, and non-Dev by default', () => {
    const envExample = readProjectFile('.env.example');

    expect(envExample).toMatch(/^PAT_ENABLED=false$/m);
    expect(envExample).not.toMatch(/^NEXT_PUBLIC_PAT_ENABLED\s*=/m);
    expect(defaultTabValue(envExample, 'LOAD_TABS').split(',')).not.toContain('dev');
    expect(defaultTabValue(envExample, 'NEXT_PUBLIC_LOAD_TABS').split(',')).not.toContain('dev');
  });

  it('passes the private PAT gate through Compose runtime only and inventories it', () => {
    const compose = readProjectFile('docker-compose.yml');
    const readme = readProjectFile('README.md');
    const logtoDashService = indentedBlock(compose, 'logto-dash', 2);
    const buildBlock = indentedBlock(logtoDashService, 'build', 4);
    const environmentBlock = indentedBlock(logtoDashService, 'environment', 4);
    const runtimeInventory = markdownBulletList(
      readme,
      'Runtime env passthrough currently includes backend and country behavior gates:',
    );
    const patEnvironmentLine = /^      - PAT_ENABLED=\$\{PAT_ENABLED:-false\}$/gm;
    const patInventoryLine = /^- `PAT_ENABLED` \(private PAT feature gate; defaults to false\)$/gm;

    expect(environmentBlock.match(patEnvironmentLine)).toHaveLength(1);
    expect(buildBlock).not.toMatch(/PAT_ENABLED/);
    expect(logtoDashService).not.toMatch(/NEXT_PUBLIC_PAT_ENABLED/);
    expect(runtimeInventory.match(patInventoryLine)).toHaveLength(1);
  });

  it('documents explicit private opt-in and retains every Dev alias', () => {
    const envExample = readProjectFile('.env.example');
    const devSource = readProjectFile('app/demo/content/tabs-and-flows/dev.tsx');
    const tabStructure = readProjectFile('app/demo/content/dashboard/tab-structure.tsx');
    const envSetup = readProjectFile('app/demo/content/getting-started/env-setup.tsx');
    const combined = `${envExample}\n${devSource}\n${tabStructure}\n${envSetup}`;

    expect(devSource).toMatch(/PAT_ENABLED=true[\s\S]{0,500}LOAD_TABS=[^\n]*\bdev\b/);
    expect(combined).not.toMatch(/^\s*NEXT_PUBLIC_PAT_ENABLED\s*=/m);
    expect(combined).toMatch(/existing Logto Management API M2M|existing Management API M2M/);
    expect(combined).toMatch(/no (?:additional|new) end-user OIDC scope/i);

    for (const alias of aliases) {
      expect(combined).toContain(alias);
    }
  });

  it('documents default-off filtering, fallback, and the direct-action hard lock', () => {
    const devSource = readProjectFile('app/demo/content/tabs-and-flows/dev.tsx');
    const tabStructure = readProjectFile('app/demo/content/dashboard/tab-structure.tsx');
    const overview = readProjectFile('app/demo/content/tabs-and-flows/overview.tsx');
    const parserDocs = `${tabStructure}\n${overview}`;

    expect(devSource).toMatch(/private[\s\S]{0,120}strict[\s\S]{0,120}default off/i);
    expect(devSource).toContain('PAT_DISABLED');
    expect(devSource).toMatch(/list, create, rename, and delete/);
    expect(devSource).toMatch(/before input validation,[\s\S]{0,260}session[\s\S]{0,260}M2M[\s\S]{0,260}lock[\s\S]{0,260}identity verification[\s\S]{0,260}upstream/);
    expect(devSource).toMatch(/does not revoke personal access tokens that already exist upstream/);

    expect(parserDocs).toMatch(/Filter after alias resolution|Post-Alias Filtering/);
    expect(parserDocs).toMatch(/Missing, empty,[\s\S]{0,100}all-invalid,[\s\S]{0,100}Dev-only/);
    expect(parserDocs).toMatch(/all non-Dev tabs/);
    expect(parserDocs).toMatch(/preserve(?:s)?[\s\S]{0,100}(?:configured )?order[\s\S]{0,100}deduplicat/i);
  });

  it('documents the locked lifecycle, token-only result, and external exchange boundary', () => {
    const source = readProjectFile('app/demo/content/tabs-and-flows/dev.tsx');

    expect(source).toMatch(/primary blue password modal opens immediately over a[\s\S]{0,80}non-interactive locked skeleton/);
    expect(source).toMatch(/successful password verification[\s\S]{0,80}<strong>and<\/strong>[\s\S]{0,80}successful PAT list fetch/);
    expect(source).toMatch(/exactly one fresh purpose-specific password challenge for every mutation/);
    expect(source).toMatch(/no intermediate[\s\S]{0,30}confirmation step[\s\S]{0,140}destructive red styling/);
    expect(source).toMatch(/close via the[\s\S]{0,20}header X, Escape, or backdrop click/);
    expect(source).toMatch(/<strong>Token created<\/strong>[\s\S]{0,180}full one-time[\s\S]{0,120}copy and close controls/);
    expect(source).toMatch(/no token metadata, usage prose,[\s\S]{0,100}generated exchange snippet/);
    expect(source).toMatch(/separate external usage guidance[\s\S]{0,160}not content in[\s\S]{0,80}result modal/);
  });

  it('preserves all four isolated verification purposes', () => {
    const source = readProjectFile('app/demo/content/tabs-and-flows/dev.tsx');

    for (const purpose of ['view', 'pat.create', 'pat.rename', 'pat.delete']) {
      expect(source).toContain(`>${purpose}</code>`);
    }
    expect(source).toMatch(/record issued for one operation cannot authorize another/);
    expect(source).toContain('atomically consumes');
    expect(source).toContain('CLIENT UX ONLY');
  });

  it('registers and navigates to the Dev documentation page', () => {
    const registry = readProjectFile('app/(docs)/[topic]/[section]/page.tsx');
    const nav = readProjectFile('app/demo/nav-data.tsx');

    expect(registry).toContain("'dev': () => import('../../../demo/content/tabs-and-flows/dev')");
    expect(nav).toMatch(/sections:\s*\[[^\]]*'Dev'/);
    expect(nav).toMatch(/Dev\/PAT/);
  });
});
