/**
 * Server-startup readiness checks.
 *
 * Next.js awaits register() before accepting requests. Redis is Node-only, so
 * keep the import runtime-gated to avoid pulling ioredis into Edge bundles.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDistributedState } = await import('./app/lib/distributed-state');
    await initDistributedState();
  }
}
