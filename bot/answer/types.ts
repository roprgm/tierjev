export type Post = { id: string; text: string; authorUsername?: string; lang?: string }

// Candidate answers keyed by lowercase form, the form to reply with as value.
export type Candidates = Map<string, string>
