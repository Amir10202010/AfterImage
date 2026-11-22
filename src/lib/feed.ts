// The feed: the last days side by side, so the constant frame and the changing weather inside it
// can be compared at a glance.
import type { Memory } from './types'

/** The feed shows at most this many days… */
export const FEED_MAX = 7
/** …and asks for more until it has at least this many. */
export const FEED_MIN = 5

/** The most recent days, newest first. */
export function feedDays<M extends Pick<Memory, 'date' | 'time'>>(memories: M[], max = FEED_MAX): M[] {
  const key = (m: M) => m.date + (m.time ?? '')
  return [...memories].sort((a, b) => key(b).localeCompare(key(a))).slice(0, max)
}
