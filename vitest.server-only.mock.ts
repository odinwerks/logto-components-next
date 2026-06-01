/**
 * No-op mock for Next.js `server-only` module.
 *
 * `server-only` is a Next.js compiled package that throws when imported from
 * a client component. In the vitest environment (which is server-like) we
 * simply export nothing - the module acts as a compile-time marker only.
 */
export {};
