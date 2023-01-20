export type APIReply<T> = { ok: true; data: T } | { ok: false; error: string }

export const makeAPIErr = (error: string) =>
	({ ok: false, error } as { ok: false; error: string })
