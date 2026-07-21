import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Suspense, useState, useEffect, act } from 'react';
import { RbacPromisesProvider, useRbacPromises } from '../../providers/rbac-stream-context';
import {
  PersonalRolesStream,
  PersonalPermissionsStream,
  OrgRolesStream,
  OrgPermissionsStream,
} from './rbac-streams';
import type {
  PersonalRbacResult,
  OrgRbacResult,
  UserRole,
  PersonalPermission,
  OrgRoleScope,
} from '../../../logic/types';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const makeRole = (id: string, name: string): UserRole => ({ id, name, description: `Role ${name}` });
const makePerm = (scope: string, resourceName: string, indicator: string): PersonalPermission => ({
  scope,
  resourceName,
  resourceIndicator: indicator,
});
const makeOrgScope = (id: string, name: string, description: string | null = null): OrgRoleScope => ({
  id,
  name,
  description,
  tenantId: 't1',
});

/** Returns a promise + a `resolve`/`reject` pair so tests can drive Suspense. */
function makeControllablePromise<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const personalRoles = [makeRole('r1', 'Admin')];
const personalPerms = [makePerm('read:x', 'X Service', 'https://api.x')];
const orgRoles = [makeRole('org-r1', 'Org Admin')];
const orgScopes = [makeOrgScope('s1', 'org:read', 'Read access')];

const personalResult: PersonalRbacResult = { roles: personalRoles, permissions: personalPerms };
const orgResult: OrgRbacResult = { roles: orgRoles, permissions: orgScopes };

// A visible fallback so we can assert Suspense is showing it.
const Fallback = ({ label }: { label: string }) => (
  <span data-testid="fallback">{label}</span>
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RbacPromisesProvider + useRbacPromises', () => {
  it('throws when useRbacPromises is called outside the provider', () => {
    // Suppress the expected React error-boundary noise from the console.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Consumer() {
      useRbacPromises();
      return null;
    }
    expect(() => render(<Consumer />)).toThrow('useRbacPromises must be used within RbacPromisesProvider');
    errSpy.mockRestore();
  });

  it('exposes the streamed promises via context', () => {
    const personalP = Promise.resolve(personalResult);
    const orgP = Promise.resolve(orgResult);
    function Consumer() {
      const { personalRbacPromise, orgRbacPromise } = useRbacPromises();
      return (
        <span data-testid="consumer">
          {personalRbacPromise === personalP ? 'same-personal' : 'diff-personal'}
          {'|'}
          {orgRbacPromise === orgP ? 'same-org' : 'diff-org'}
        </span>
      );
    }
    render(
      <RbacPromisesProvider personalRbacPromise={personalP} orgRbacPromise={orgP}>
        <Consumer />
      </RbacPromisesProvider>,
    );
    expect(screen.getByTestId('consumer').textContent).toBe('same-personal|same-org');
  });

  it('normalizes undefined orgRbacPromise to null', () => {
    const personalP = Promise.resolve(personalResult);
    function Consumer() {
      const { orgRbacPromise } = useRbacPromises();
      return <span data-testid="org-null">{orgRbacPromise === null ? 'null' : 'not-null'}</span>;
    }
    render(
      <RbacPromisesProvider personalRbacPromise={personalP} orgRbacPromise={undefined}>
        <Consumer />
      </RbacPromisesProvider>,
    );
    expect(screen.getByTestId('org-null').textContent).toBe('null');
  });
});

describe('PersonalRolesStream', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('renders the fallback while the promise is pending, then the resolved roles', async () => {
    const { promise, resolve } = makeControllablePromise<PersonalRbacResult>();
    // Wrap render in `act` so React 19's `use()` can attach its wake
    // listener before we resolve the promise. The react-package `act`
    // (not @testing-library/react's re-export) is required for `use()` to
    // release Suspense properly in this test environment.
    await act(async () => {
      render(
        <RbacPromisesProvider personalRbacPromise={promise} orgRbacPromise={null}>
          <Suspense fallback={<Fallback label="loading-roles" />}>
            <PersonalRolesStream
              render={(initialRoles) => (
                <ul data-testid="roles-list">
                  {(initialRoles ?? []).map((r) => (
                    <li key={r.id}>{r.name}</li>
                  ))}
                </ul>
              )}
            />
          </Suspense>
        </RbacPromisesProvider>,
      );
    });

    // Suspense fallback is shown while the promise is pending.
    expect(screen.getByTestId('fallback').textContent).toBe('loading-roles');
    expect(screen.queryByTestId('roles-list')).toBeNull();

    // Resolve the promise. Awaiting the promise INSIDE `act` lets React 19's
    // `use()` hook flush the resolution and re-render the suspended subtree.
    await act(async () => {
      resolve(personalResult);
      await promise;
    });
    expect(screen.getByTestId('roles-list').textContent).toContain('Admin');
  });

  it('renders children with undefined initialData when no promise is provided (hook fetches on mount)', () => {
    render(
      <RbacPromisesProvider personalRbacPromise={undefined} orgRbacPromise={null}>
        <Suspense fallback={<Fallback label="loading" />}>
          <PersonalRolesStream
            render={(initialRoles) => (
              <span data-testid="no-promise">{initialRoles === undefined ? 'undefined' : 'array'}</span>
            )}
          />
        </Suspense>
      </RbacPromisesProvider>,
    );
    // No promise → no `use()` call → no suspense. Render prop got `undefined`.
    expect(screen.getByTestId('no-promise').textContent).toBe('undefined');
    expect(screen.queryByTestId('fallback')).toBeNull();
  });
});

describe('PersonalPermissionsStream', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('renders the streamed permissions after the promise resolves', async () => {
    const { promise, resolve } = makeControllablePromise<PersonalRbacResult>();
    await act(async () => {
      render(
        <RbacPromisesProvider personalRbacPromise={promise} orgRbacPromise={null}>
          <Suspense fallback={<Fallback label="loading-perms" />}>
            <PersonalPermissionsStream
              render={(initialPerms) => (
                <ul data-testid="perms-list">
                  {(initialPerms ?? []).map((p) => (
                    <li key={`${p.resourceIndicator}:${p.scope}`}>{p.scope}</li>
                  ))}
                </ul>
              )}
            />
          </Suspense>
        </RbacPromisesProvider>,
      );
    });

    expect(screen.getByTestId('fallback').textContent).toBe('loading-perms');

    await act(async () => {
      resolve(personalResult);
      await promise;
    });
    expect(screen.getByTestId('perms-list').textContent).toContain('read:x');
  });
});

describe('OrgRolesStream', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('calls render(undefined) when orgRbacPromise is null (no `use()` call)', () => {
    // No promise — could be "no active org" OR "active org but no pre-fetched
    // promise". Either way, the stream calls `render(undefined)` so the
    // downstream hook decides whether to fetch.
    render(
      <RbacPromisesProvider personalRbacPromise={undefined} orgRbacPromise={null}>
        <Suspense fallback={<Fallback label="should-not-appear" />}>
          <OrgRolesStream
            render={(initialRoles) => (
              <span data-testid="org-roles">
                {initialRoles === undefined ? 'undefined' : `array:${initialRoles.length}`}
              </span>
            )}
          />
        </Suspense>
      </RbacPromisesProvider>,
    );
    // No `use()` call → no Suspense → render prop got `undefined`.
    expect(screen.getByTestId('org-roles').textContent).toBe('undefined');
    expect(screen.queryByTestId('fallback')).toBeNull();
  });

  it('renders streamed org roles after the promise resolves', async () => {
    const { promise, resolve } = makeControllablePromise<OrgRbacResult>();
    await act(async () => {
      render(
        <RbacPromisesProvider personalRbacPromise={undefined} orgRbacPromise={promise}>
          <Suspense fallback={<Fallback label="loading-org-roles" />}>
            <OrgRolesStream
              render={(initialRoles) => (
                <ul data-testid="org-roles-list">
                  {(initialRoles ?? []).map((r) => <li key={r.id}>{r.name}</li>)}
                </ul>
              )}
            />
          </Suspense>
        </RbacPromisesProvider>,
      );
    });

    expect(screen.getByTestId('fallback').textContent).toBe('loading-org-roles');

    await act(async () => {
      resolve(orgResult);
      await promise;
    });
    expect(screen.getByTestId('org-roles-list').textContent).toContain('Org Admin');
  });
});

describe('OrgPermissionsStream', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('calls render(undefined) when orgRbacPromise is null', () => {
    render(
      <RbacPromisesProvider personalRbacPromise={undefined} orgRbacPromise={null}>
        <Suspense fallback={<Fallback label="should-not-appear" />}>
          <OrgPermissionsStream
            render={(initialData) => (
              <span data-testid="org-perms">
                {initialData === undefined ? 'undefined' : `perms:${initialData.permissions.length}`}
              </span>
            )}
          />
        </Suspense>
      </RbacPromisesProvider>,
    );
    expect(screen.getByTestId('org-perms').textContent).toBe('undefined');
    expect(screen.queryByTestId('fallback')).toBeNull();
  });

  it('builds the descriptions Map and permissions array client-side from streamed OrgRoleScope[]', async () => {
    const { promise, resolve } = makeControllablePromise<OrgRbacResult>();
    await act(async () => {
      render(
        <RbacPromisesProvider personalRbacPromise={undefined} orgRbacPromise={promise}>
          <Suspense fallback={<Fallback label="loading" />}>
            <OrgPermissionsStream
              render={(initialData) => (
                <span data-testid="org-perms">
                  {initialData?.permissions.join(',')}|{initialData?.descriptions.get('org:read')?.description}
                </span>
              )}
            />
          </Suspense>
        </RbacPromisesProvider>,
      );
    });

    await act(async () => {
      resolve(orgResult);
      await promise;
    });
    const text = screen.getByTestId('org-perms').textContent ?? '';
    // permissions array is the scope NAMES (string[]), not the objects.
    expect(text).toContain('org:read');
    // descriptions Map is keyed by scope name and includes the description.
    expect(text).toContain('Read access');
  });

  it('renders the fallback while the promise is pending', () => {
    const { promise } = makeControllablePromise<OrgRbacResult>();
    render(
      <RbacPromisesProvider personalRbacPromise={undefined} orgRbacPromise={promise}>
        <Suspense fallback={<Fallback label="loading-org-perms" />}>
          <OrgPermissionsStream
            render={(initialData) => (
              <span data-testid="org-perms">{initialData?.permissions.length ?? 0}</span>
            )}
          />
        </Suspense>
      </RbacPromisesProvider>,
    );
    expect(screen.getByTestId('fallback').textContent).toBe('loading-org-perms');
  });
});

// ─── React 19 `use()` Rules-of-Hooks guard ─────────────────────────────────
//
// Verify that the stream consumers don't call `use()` when the promise is
// null/undefined — this is the invariant that keeps them Hooks-safe.

describe('use() Rules-of-Hooks safety', () => {
  it('PersonalRolesStream does NOT suspend when the promise is undefined', () => {
    const suspenseFallback = vi.fn(() => <Fallback label="suspended" />);
    render(
      <RbacPromisesProvider personalRbacPromise={undefined} orgRbacPromise={null}>
        <Suspense fallback={suspenseFallback()}>
          <PersonalRolesStream
            render={() => <span data-testid="rendered">rendered</span>}
          />
        </Suspense>
      </RbacPromisesProvider>,
    );
    // If `use()` had been called with undefined, React would throw or
    // suspend. The render prop ran synchronously.
    expect(screen.getByTestId('rendered').textContent).toBe('rendered');
  });

  it('OrgRolesStream does NOT suspend when orgRbacPromise is null', () => {
    render(
      <RbacPromisesProvider personalRbacPromise={undefined} orgRbacPromise={null}>
        <Suspense fallback={<Fallback label="suspended" />}>
          <OrgRolesStream
            render={(initialRoles) => (
              <span data-testid="rendered">
                {initialRoles === undefined ? 'undefined' : 'array'}
              </span>
            )}
          />
        </Suspense>
      </RbacPromisesProvider>,
    );
    // No `use()` call → no Suspense → render prop ran with `undefined`.
    expect(screen.getByTestId('rendered').textContent).toBe('undefined');
    expect(screen.queryByTestId('fallback')).toBeNull();
  });

  it('promise identity change re-suspends and renders fresh data (org-switch simulation)', async () => {
    const first = makeControllablePromise<OrgRbacResult>();
    const second = makeControllablePromise<OrgRbacResult>();

    function Harness({ orgPromise }: { orgPromise: Promise<OrgRbacResult> }) {
      return (
        <RbacPromisesProvider personalRbacPromise={undefined} orgRbacPromise={orgPromise}>
          <Suspense fallback={<Fallback label="loading" />}>
            <OrgRolesStream
              render={(initialRoles) => (
                <span data-testid="roles">{(initialRoles ?? []).map((r) => r.name).join(',')}</span>
              )}
            />
          </Suspense>
        </RbacPromisesProvider>
      );
    }

    let rerender!: ReturnType<typeof render>['rerender'];
    await act(async () => {
      const result = render(<Harness orgPromise={first.promise} />);
      rerender = result.rerender;
    });
    // First render: pending → fallback.
    expect(screen.queryByTestId('fallback')).not.toBeNull();

    // Resolve the first promise.
    await act(async () => {
      first.resolve({ roles: [makeRole('a', 'Alpha')], permissions: [] });
      await first.promise;
    });
    expect(screen.getByTestId('roles').textContent).toBe('Alpha');

    // Switch the promise (simulates org-switch / router.refresh()).
    await act(async () => {
      rerender(<Harness orgPromise={second.promise} />);
    });
    // The new promise is pending → Suspense fallback is showing again.
    // (React 19 keeps the previous content in the DOM but hidden via
    // `display: none !important` until the new content resolves — so we
    // check the fallback is visible, not that the roles element is gone.)
    expect(screen.queryByTestId('fallback')).not.toBeNull();

    // Resolve the second promise with new data.
    await act(async () => {
      second.resolve({ roles: [makeRole('b', 'Beta')], permissions: [] });
      await second.promise;
    });
    expect(screen.getByTestId('roles').textContent).toBe('Beta');
  });

  // Silence React's "act" warning for async effects that schedule updates
  // after the test ends. We keep this here so the suite is clean.
  it('supports a render prop that calls a hook with the streamed initialData (smoke)', async () => {
    const { promise, resolve } = makeControllablePromise<PersonalRbacResult>();

    // A minimal hook-using consumer that seeds state from initialData.
    function RolesList({ initialRoles }: { initialRoles: UserRole[] | undefined }) {
      const [roles] = useState<UserRole[]>(initialRoles ?? []);
      // useEffect to prove the consumer can use hooks; the streamed data
      // seeds initial state so no fetch runs.
      useEffect(() => {
        // no-op (would normally call usePersonalRoles(userId, initialRoles))
      }, []);
      return <ul data-testid="seeded-list">{roles.map((r) => <li key={r.id}>{r.name}</li>)}</ul>;
    }

    await act(async () => {
      render(
        <RbacPromisesProvider personalRbacPromise={promise} orgRbacPromise={null}>
          <Suspense fallback={<Fallback label="loading" />}>
            <PersonalRolesStream
              render={(initialRoles) => <RolesList initialRoles={initialRoles} />}
            />
          </Suspense>
        </RbacPromisesProvider>,
      );
    });

    await act(async () => {
      resolve(personalResult);
      await promise;
    });
    expect(screen.getByTestId('seeded-list').textContent).toContain('Admin');
  });
});
