/**
 * The only module that knows the API speaks snake_case.
 *
 * Everything above this line works in camelCase domain types; everything
 * below it is the wire format from `backend/app/schemas.py`.
 */

import type {
  BouquetDesign,
  CreatedBouquet,
  LockedBouquet,
  OpenBouquet,
  SharedBouquet,
  WireBouquet,
  WireCreated,
  WireDesign,
} from '../types/bouquet';

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: string[];

  constructor(status: number, message: string, fieldErrors: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** True when retrying later might work. */
  get isTransient(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

interface ValidationIssue {
  loc?: unknown[];
  msg?: string;
}

/** Pull something human-readable out of a FastAPI error body. */
async function describeFailure(response: Response): Promise<ApiError> {
  let detail: unknown;
  try {
    const body: unknown = await response.json();
    detail = (body as { detail?: unknown }).detail;
  } catch {
    detail = undefined;
  }

  if (typeof detail === 'string') {
    return new ApiError(response.status, detail);
  }

  if (Array.isArray(detail)) {
    const issues = (detail as ValidationIssue[])
      .map((issue) => {
        const field = Array.isArray(issue.loc) ? issue.loc.slice(1).join('.') : '';
        return field ? `${field}: ${issue.msg ?? 'invalid'}` : (issue.msg ?? 'invalid');
      })
      .filter(Boolean);
    return new ApiError(
      response.status,
      issues[0] ?? 'That bouquet did not pass validation.',
      issues,
    );
  }

  const fallback =
    response.status === 404
      ? 'We could not find that bouquet.'
      : 'Something went wrong on our side. Please try again.';
  return new ApiError(response.status, fallback);
}

function toWire(design: BouquetDesign): WireDesign {
  return {
    mode: design.mode,
    flowers: design.flowers,
    greenery: design.greenery,
    wrap: design.wrap,
    ribbon: design.ribbon,
    mono: design.mono,
    recipient_name: design.recipientName,
    sender_name: design.senderName,
    message: design.message,
    letter_text: design.letterText,
    reveal_at: design.revealAt,
  };
}

function fromWire(wire: WireBouquet): SharedBouquet {
  if (wire.locked) {
    const locked: LockedBouquet = {
      id: wire.id,
      createdAt: wire.created_at,
      locked: true,
      mode: wire.mode,
      revealAt: wire.reveal_at,
      wrap: wire.wrap,
      ribbon: wire.ribbon,
      recipientName: wire.recipient_name,
      senderName: wire.sender_name,
    };
    return locked;
  }

  const open: OpenBouquet = {
    id: wire.id,
    createdAt: wire.created_at,
    locked: false,
    mode: wire.mode,
    flowers: wire.flowers,
    greenery: wire.greenery,
    wrap: wire.wrap,
    ribbon: wire.ribbon,
    mono: wire.mono,
    recipientName: wire.recipient_name,
    senderName: wire.sender_name,
    message: wire.message,
    letterText: wire.letter_text ?? null,
    revealAt: wire.reveal_at ?? null,
  };
  return open;
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError(0, 'We could not reach the server. Check your connection.');
  }
  if (!response.ok) throw await describeFailure(response);
  return response;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init);
  return (await response.json()) as T;
}

/** Check the create code. Resolves when accepted, throws a 403 ApiError when not. */
export async function unlock(code: string): Promise<void> {
  await send('/api/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
}

/** Save a bouquet. It becomes the one on the home page. */
export async function createBouquet(
  design: BouquetDesign,
  code: string,
): Promise<CreatedBouquet> {
  const wire = await request<WireCreated>('/api/bouquets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Create-Code': code },
    body: JSON.stringify(toWire(design)),
  });
  return { id: wire.id };
}

/** The bouquet on the home page, or null before anyone has made one. */
export async function fetchHome(signal?: AbortSignal): Promise<SharedBouquet | null> {
  const wire = await request<WireBouquet | null>('/api/home', signal ? { signal } : undefined);
  return wire ? fromWire(wire) : null;
}
