// Session storage keeps the login in this browser tab until logout or tab close.
export function getToken() {
  return sessionStorage.getItem('bizcard_token');
}

export function logout() {
  sessionStorage.removeItem('bizcard_token');
}

export async function api(path, options = {}) {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Cannot connect. Check your connection and try again.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.detail === 'string'
      ? data.detail
      : Array.isArray(data?.detail) ? data.detail.map(item => `${item.loc?.at(-1) || 'Input'}: ${item.msg}`).join('. ')
      : response.status >= 500 ? 'The server is unavailable. Please try again shortly.' : 'Please check your details and try again.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function download(path, filename) {
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
