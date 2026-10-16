// Browser helper for the app's own API routes. Throws with the server's error message.
export async function api<T = { ok: true }>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || data === null) {
    throw new Error((data as { error?: string } | null)?.error ?? `Request failed (${res.status})`)
  }
  return data as T
}
