/**
 * Fetch wrapper untuk API HRIS.
 * - baseURL dari env NEXT_PUBLIC_API_URL (default http://localhost:8000/api/v1)
 * - otomatis memasang header Authorization: Bearer <access_token>
 * - saat 401: coba refresh token SEKALI, lalu ulangi request awal
 * - helper get / post / put / del / upload (multipart)
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000/api/v1";

const ACCESS_KEY = "hris.access_token";
const REFRESH_KEY = "hris.refresh_token";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  detail?: string;
  code?: string;
  message?: string;
}

async function parseError(res: Response): Promise<ApiError> {
  let message = "Terjadi kesalahan. Coba lagi.";
  let code: string | undefined;
  try {
    const body = (await res.json()) as ErrorBody;
    if (typeof body.detail === "string" && body.detail.trim()) message = body.detail;
    else if (typeof body.message === "string" && body.message.trim()) message = body.message;
    code = body.code;
  } catch {
    // bukan JSON — pakai pesan bawaan
  }
  if (res.status === 401) message = "Sesi Anda berakhir. Masuk kembali.";
  if (res.status === 403) message = "Anda tidak memiliki akses ke fitur ini.";
  if (res.status === 404) message = "Data tidak ditemukan.";
  if (res.status >= 500) message = "Server bermasalah. Coba lagi nanti.";
  return new ApiError(res.status, message, code);
}

/** Lock agar refresh token hanya berjalan sekali walau banyak request 401 bersamaan. */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return null;
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { access_token?: string };
        if (!data.access_token) return null;
        if (isBrowser()) window.localStorage.setItem(ACCESS_KEY, data.access_token);
        return data.access_token;
      } catch {
        return null;
      } finally {
        // reset di microtask berikutnya agar pemanggil paralel tetap berbagi hasil
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

type QueryValue = string | number | boolean | null | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

interface RequestOptions {
  query?: Record<string, QueryValue>;
  /** Lewati pemasangan Authorization (mis. /auth/login). */
  anonymous?: boolean;
  /** Jangan coba refresh saat 401 (mis. /auth/refresh itu sendiri). */
  noRefresh?: boolean;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (!options.anonymous) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  if (res.status === 401 && !options.anonymous && !options.noRefresh && !retried) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(method, path, body, options, true);
    }
    clearTokens();
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  del: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
  /** Upload multipart (mis. impor CSV, dokumen). Jangan set Content-Type manual. */
  upload: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>("POST", path, formData, options),
};
