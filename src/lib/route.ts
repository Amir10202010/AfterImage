// Route parameters come straight from the address bar: check them before a view trusts them.

/** A real calendar date written as YYYY-MM-DD (so 2025-02-30 and "not-a-date" are rejected). */
export function isISODate(s: string | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const t = new Date(y, m - 1, d)
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d
}

/** A month written as YYYY-MM, months 01 to 12. */
export function isYearMonth(s: string | undefined): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
}
