// The one agreement a person accepts on entering the app: the Terms and the Privacy notice, which say
// what stays on the device and what, for The Stranger and for drawing a picture from words, is sent to
// Google Gemini (and Pollinations) under the project's own keys. Bump VERSION when those texts change
// in a way people should see again.
const KEY = 'afterimage.agreed'
export const AGREEMENT_VERSION = '2026-11-22'

const listeners = new Set<() => void>()

export function hasAgreed(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === AGREEMENT_VERSION
  } catch {
    return false
  }
}

export function agree() {
  try {
    localStorage.setItem(KEY, AGREEMENT_VERSION)
  } catch {
    /* private mode: agreed for this visit */
  }
  agreedThisVisit = true
  listeners.forEach((l) => l())
}

let agreedThisVisit = false
/** Agreed now or before (the in-memory flag covers browsers that block storage). */
export function agreed() {
  return agreedThisVisit || hasAgreed()
}

export function onAgree(f: () => void): () => void {
  listeners.add(f)
  return () => {
    listeners.delete(f)
  }
}
