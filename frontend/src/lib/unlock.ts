/**
 * The create code, remembered for the browser session once it has been
 * accepted. The server checks it again on create, so this is convenience,
 * not security.
 */

import { STORAGE_KEYS } from '../config';

export function readCode(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.code);
  } catch {
    return null;
  }
}

export function rememberCode(code: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.code, code);
  } catch {
    // Private mode: the builder still opens, it just asks again next time.
  }
}

export function forgetCode(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.code);
  } catch {
    // Nothing to do.
  }
}
