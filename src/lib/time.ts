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

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "3 years ago", "8 months ago", "yesterday" */
export function ago(d: string, now = new Date()) {
  // calendar days, not elapsed time: at 2 pm, a date from this morning is still "today"
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((today.getTime() - parse(d).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 45) return `${days} days ago`
  const months = Math.round(days / 30.44)
  if (months < 18) return `${months} months ago`
  // a small allowance, so exactly two calendar years (730 days) reads as 2, not 1.998 → 1
  const years = Math.floor(days / 365.25 + 0.05)
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
