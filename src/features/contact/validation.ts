export interface ContactFields {
  name: string
  email: string
  subject: string
  message: string
}

type ContactResult = { ok: true; data: ContactFields } | { ok: false; error: string; field?: keyof ContactFields }

/** The browser and API share the same limits; invalid types never reach Prisma. */
export function validateContact(input: unknown): ContactResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Please enter your name, email, and message.' }
  const body = input as Record<string, unknown>
  for (const field of ['name', 'email', 'message'] as const) {
    if (typeof body[field] !== 'string') return { ok: false, error: `Please enter a valid ${field}.`, field }
  }
  if (body.subject !== undefined && typeof body.subject !== 'string') return { ok: false, error: 'Please enter a valid subject.', field: 'subject' }
  const data: ContactFields = {
    name: (body.name as string).trim(), email: (body.email as string).trim(),
    subject: typeof body.subject === 'string' ? body.subject.trim() : '', message: (body.message as string).trim(),
  }
  if (!data.name || data.name.length > 100) return { ok: false, error: 'Please enter a name between 1 and 100 characters.', field: 'name' }
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { ok: false, error: 'Please enter a valid email address.', field: 'email' }
  if (data.subject.length > 200) return { ok: false, error: 'Please keep the subject under 200 characters.', field: 'subject' }
  if (data.message.length < 10 || data.message.length > 5000) return { ok: false, error: 'Please enter a message between 10 and 5,000 characters.', field: 'message' }
  return { ok: true, data }
}
