import service from '../service.mjs';

export const BACKEND_INPUT = Symbol('BACKEND_INPUT');

export type BackendInput = ReturnType<typeof service.input>;

let cached: BackendInput | undefined;

/**
 * The service's validated input (JWT secret, frontend origin). Resolved once
 * per process from the Composer service declaration; never from the shell.
 */
export function backendInput(): BackendInput {
  cached ??= service.input();
  return cached;
}
