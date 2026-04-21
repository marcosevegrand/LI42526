const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3001/api/v1';

type ApiErrorPayload = {
  error?: string;
  message?: string;
  traceId?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly traceId?: string;

  constructor(message: string, status: number, code?: string, traceId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (path.startsWith('/')) {
    return `${apiBaseUrl}${path}`;
  }

  return `${apiBaseUrl}/${path}`;
}

function shouldSetJsonContentType(init?: RequestInit): boolean {
  if (!init?.body) {
    return false;
  }

  if (typeof FormData !== 'undefined' && init.body instanceof FormData) {
    return false;
  }

  return true;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!headers.has('Content-Type') && shouldSetJsonContentType(init)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new ApiError(
      'Sem ligacao a API. Verifique se o backend esta ativo e tente novamente.',
      0,
      'network_error',
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new ApiError(
      payload?.message ?? 'Request failed',
      response.status,
      payload?.error,
      payload?.traceId,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
