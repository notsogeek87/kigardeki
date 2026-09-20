// Vitest runs outside Next's "react-server" bundler condition, so the real
// `server-only` package would unconditionally throw on import. This no-op
// stub is aliased in for tests only (see vitest.config.ts) — production
// builds still use the real package via Next's webpack config.
export {};
