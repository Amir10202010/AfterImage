const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export const roman = (n: number) => ROMAN[n - 1] ?? String(n)

function parse(d: string) {
  // YYYY-MM-DD is treated as a local calendar date
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day)
  }
  return new Date(d)
}

export function longDate(d: string) {
  const x = parse(d)
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`
}
export function monthYear(d: string) {
  const x = parse(d)
  return `${MONTHS[x.getMonth()]} ${x.getFullYear()}`
}
export function weekday(d: string) {
  return parse(d).toLocaleDateString('en-GB', { weekday: 'long' })
}
export function year(d: string) {
  return parse(d).getFullYear()
}

/** A local calendar date as YYYY-MM-DD (toISOString would give the UTC date, a day off near midnight). */
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayISO() {
  return isoDate(new Date())
}

/** "3 years ago", "8 months ago", "yesterday" */
export function ago(d: string, now = new Date()) {
  const ms = now.getTime() - parse(d).getTime()
  const days = Math.round(ms / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 45) return `${days} days ago`
  const months = Math.round(days / 30.44)
  if (months < 18) return `${months} months ago`
  const years = Math.floor(days / 365.25)
  return years === 1 ? 'a year ago' : `${years} years ago`
}

/** "in 2 days", "in 4 hours", "in a moment" */
export function until(iso: string, now = Date.now()) {
  const ms = new Date(iso).getTime() - now
  if (ms <= 0) return 'now'
  const min = ms / 60000
  if (min < 2) return 'in a moment'
  if (min < 90) return `in ${Math.round(min)} minutes`
  const h = min / 60
  if (h < 36) return `in ${Math.round(h)} hours`
  const d = h / 24
  if (d < 60) return `in ${Math.round(d)} days`
  const mo = d / 30.44
  if (mo < 24) return `in ${Math.round(mo)} months`
  return `in ${Math.round(d / 365.25)} years`
}

export function addMs(ms: number) {
  return new Date(Date.now() + ms).toISOString()
}
