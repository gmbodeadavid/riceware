/** Appels aux Route Handlers admin depuis les composants clients. */

export type AdminApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; issues?: string[] };

type ErrorPayload = { error?: string; issues?: string[] } | null;

export async function adminRequest<T>(url: string, init: RequestInit = {}): Promise<AdminApiResult<T>> {
  const isJsonBody = typeof init.body === 'string';

  try {
    const response = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers: isJsonBody ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
    });

    if (response.status === 401) {
      window.location.assign('/admin/login');
      return { ok: false, error: 'Session expirée, reconnectez-vous.' };
    }

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const errorPayload = payload as ErrorPayload;
      return {
        ok: false,
        error: errorPayload?.error ?? 'Une erreur inattendue est survenue.',
        issues: errorPayload?.issues,
      };
    }

    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, error: 'Connexion au serveur impossible. Vérifiez votre réseau.' };
  }
}
