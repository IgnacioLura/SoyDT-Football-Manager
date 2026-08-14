export type ApiError = { code: string; message: string }

export async function callApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  // ASP.NET returns 204 No Content (empty body) for `Ok(null)` on a
  // nullable reference type — e.g. "no season awards yet" — `res.json()`
  // throws on an empty body, so treat 204 as `null` instead of parsing.
  if (res.status === 204) {
    return null as T
  }
  const body = await res.json()
  if (!res.ok) {
    const error = body as ApiError
    throw new Error(`${error.code}: ${error.message}`)
  }
  return body as T
}
