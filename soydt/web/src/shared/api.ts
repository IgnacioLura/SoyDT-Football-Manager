export type ApiError = { code: string; message: string }

export async function callApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  // ASP.NET returns 204 No Content (e.g. "no season awards yet") and 202
  // Accepted (e.g. `process/live`'s fire-and-forget kickoff) with an empty
  // body — `res.json()` throws `SyntaxError: Unexpected end of JSON input`
  // on empty text, so check for that instead of parsing straight away.
  // Only a genuinely *successful* empty body means "no data" — an empty
  // body on an error response (a 502 from a dead backend, a proxy
  // failure) must still throw, or callers silently get `null` back and
  // crash later on whatever field they expected (e.g. `status.hasGame`)
  // instead of surfacing the real failure here.
  const text = await res.text()
  if (text.length === 0) {
    if (!res.ok) {
      throw new Error(`http_${res.status}: request failed with an empty response body`)
    }
    return null as T
  }
  const body = JSON.parse(text)
  if (!res.ok) {
    const error = body as ApiError
    throw new Error(`${error.code}: ${error.message}`)
  }
  return body as T
}
