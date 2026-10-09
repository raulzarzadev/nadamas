type Entry = { data?: unknown; response?: Response; pending?: Promise<Response>; expiresAt: number }

/** Memory-only cache. Each consumer receives an independent response body. */
export class AuthedRequestCache {
  private entries = new Map<string, Entry>()
  constructor(
    private readonly maxEntries = 128,
    private readonly now = Date.now
  ) {}

  invalidate(matches: (key: string) => boolean = () => true) {
    for (const key of this.entries.keys()) if (matches(key)) this.entries.delete(key)
  }

  peek(key: string) {
    const entry = this.entries.get(key)
    return entry && entry.expiresAt > this.now() ? entry.data : undefined
  }

  async get(key: string, load: () => Promise<Response>, ttl: number) {
    const cached = this.entries.get(key)
    if (cached?.response && cached.expiresAt > this.now()) return cached.response.clone()
    if (cached?.pending) return (await cached.pending).clone()
    this.entries.delete(key)
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
    const entry: Entry = { expiresAt: 0 }
    this.entries.set(key, entry)
    entry.pending = Promise.resolve()
      .then(load)
      .then(async (response) => {
        const data =
          ttl > 0 && response.headers.get('content-type')?.includes('application/json')
            ? await response
                .clone()
                .json()
                .catch(() => undefined)
            : undefined
        if (this.entries.get(key) === entry) {
          if (ttl > 0) {
            entry.data = data
            entry.response = response
            entry.expiresAt = this.now() + ttl
            entry.pending = undefined
          } else this.entries.delete(key)
        }
        return response
      })
      .catch((error: unknown) => {
        if (this.entries.get(key) === entry) this.entries.delete(key)
        throw error
      })
    return (await entry.pending).clone()
  }
}
