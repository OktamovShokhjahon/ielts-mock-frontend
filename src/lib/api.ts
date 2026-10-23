const API = process.env.NEXT_PUBLIC_API_URL || "https://ielts-mock-backend-nczh.onrender.com/";

export function getApiUrl(): string {
  return API;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, headers: hdr, ...rest } = options;
  const headers = new Headers(hdr);
  let body: BodyInit | undefined = rest.body as BodyInit | undefined;
  if (json !== undefined) {
    body = JSON.stringify(json);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API}${path}`, {
    ...rest,
    body,
    headers,
    credentials: "include",
    cache: typeof window === "undefined" ? "no-store" : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let err = text;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) err = j.error;
    } catch { /* use text */ }
    throw new Error(err || `HTTP ${res.status}`);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function uploadAudio(mockId: string, file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("audio", file);
  const res = await fetch(`${API}/api/admin/mocks/${mockId}/listening-audio`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return text ? JSON.parse(text) : null;
}

export async function uploadPartAudio(mockId: string, partId: string, file: File): Promise<{ filename: string }> {
  const fd = new FormData();
  fd.append("audio", file);
  const res = await fetch(`${API}/api/admin/mocks/${mockId}/parts/${partId}/audio`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return text ? (JSON.parse(text) as { filename: string }) : { filename: "" };
}
