// Session storage keeps the login in this browser tab until logout or tab close.
export function getToken(): string | null {
  return sessionStorage.getItem('bizcard_token');
}

export function logout(): void {
  sessionStorage.removeItem('bizcard_token');
}

export class ApiError extends Error {
  status?: number;
}

interface ValidationItem { loc?: Array<string | number>; msg: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ApiError('Cannot connect. Check your connection and try again.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail) ? (detail as ValidationItem[]).map(item => `${item.loc?.at(-1) || 'Input'}: ${item.msg}`).join('. ')
      : response.status >= 500 ? 'The server is unavailable. Please try again shortly.' : 'Please check your details and try again.';
    const error = new ApiError(message);
    error.status = response.status;
    throw error;
  }
  return data as T;
}

export async function download(path: string, filename: string): Promise<void> {
  const response = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error('Download failed.');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Download a file and report a readable error instead of failing silently. */
export async function downloadOrReport(path: string, filename: string, report: (message: string) => void): Promise<void> {
  try {
    await download(path, filename);
  } catch {
    report('The file could not be downloaded. Please try again.');
  }
}
