// Listening to the song a person attaches, on the device: how fast it is, how loud and dense, how bright.
// The file never leaves the browser; only these three numbers are kept with the day.

export interface Heard {
  /** beats per minute, estimated from the rhythm of the loudness */
  bpm: number
  /** 0 to 1: loudness and how busy the sound is */
  energy: number
  /** 0 to 1: how much treble there is */
  brightness: number
}

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x))

/** Works on raw mono samples, so it can be tested without a browser. Looks at up to a minute from the middle. */
export function analyse(samples: Float32Array, rate: number): Heard {
  const span = Math.min(samples.length, Math.round(rate * 60))
  const from = Math.max(0, Math.floor(samples.length / 2 - span / 2))
  const x = samples.subarray(from, from + span)

  const frame = 1024
  const hop = 256
  const frames = Math.max(0, Math.floor((x.length - frame) / hop))
  const loud = new Float32Array(frames)
  let sumSq = 0
  let crossings = 0
  for (let f = 0; f < frames; f++) {
    let e = 0
    const o = f * hop
    for (let i = 0; i < frame; i++) {
      const v = x[o + i]
      e += v * v
    }
    loud[f] = Math.log10(1e-9 + e / frame)
  }
  for (let i = 1; i < x.length; i++) {
    sumSq += x[i] * x[i]
    if (x[i - 1] < 0 !== x[i] < 0) crossings++
  }

  // onset strength: how much louder each moment is than the one before
  const onset = new Float32Array(frames)
  let mean = 0
  for (let f = 1; f < frames; f++) {
    onset[f] = Math.max(0, loud[f] - loud[f - 1])
    mean += onset[f]
  }
  mean /= Math.max(1, frames - 1)
  for (let f = 0; f < frames; f++) onset[f] = Math.max(0, onset[f] - mean)
  // a little blur, so a beat that falls between two frames still lines up with itself
  for (let pass = 0; pass < 2; pass++) {
    let prev = onset[0]
    for (let f = 1; f < frames - 1; f++) {
      const here = onset[f]
      onset[f] = 0.25 * prev + 0.5 * here + 0.25 * onset[f + 1]
      prev = here
    }
  }

  // tempo: the lag at which the onsets repeat best, between 60 and 180 bpm, gently preferring the middle
  const perSec = rate / hop
  const lo = Math.floor((perSec * 60) / 180)
  const hi = Math.ceil((perSec * 60) / 60)
  let best = 0
  let bestLag = Math.round((perSec * 60) / 100)
  for (let lag = lo; lag <= hi; lag++) {
    let r = 0
    for (let f = lag; f < frames; f++) r += onset[f] * onset[f - lag]
    const bpm = (60 * perSec) / lag
    const prefer = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 115) / 0.9, 2))
    if (r * prefer > best) {
      best = r * prefer
      bestLag = lag
    }
  }
  // refine between neighbouring lags
  const at = (lag: number) => {
    let r = 0
    for (let f = lag; f < frames; f++) r += onset[f] * onset[f - lag]
    return r
  }
  // a loud, busy song heard at half speed is usually a fast one: try the double tempo too
  const busy = clamp((20 * Math.log10(Math.sqrt(sumSq / Math.max(1, x.length)) + 1e-9) + 30) / 22) > 0.55
  const half = Math.round(bestLag / 2)
  if (busy && (60 * perSec) / bestLag < 92 && (60 * perSec) / half <= 200 && at(half) >= 0.6 * at(bestLag)) bestLag = half
  const [a, b, c] = [at(bestLag - 1), at(bestLag), at(bestLag + 1)]
  const shift = a - 2 * b + c !== 0 ? (0.5 * (a - c)) / (a - 2 * b + c) : 0
  const bpm = (60 * perSec) / (bestLag + clamp(shift, -0.5, 0.5))

  // energy: loudness in dBFS (-30 dB quiet, -8 dB loud) and how often new sounds start
  const rms = Math.sqrt(sumSq / Math.max(1, x.length))
  const db = 20 * Math.log10(rms + 1e-9)
  const loudness = clamp((db + 30) / 22)
  let peaks = 0
  for (let f = 1; f < frames - 1; f++) if (onset[f] > 0.05 && onset[f] >= onset[f - 1] && onset[f] > onset[f + 1]) peaks++
  const density = clamp(peaks / Math.max(1, frames / perSec) / 5)
  const energy = clamp(0.7 * loudness + 0.3 * density)

  // brightness: zero crossings per second, a cheap stand-in for treble
  const zcr = crossings / Math.max(1, x.length / rate)
  const brightness = clamp((zcr - 600) / 4000)

  return { bpm: Math.round(clamp(bpm, 40, 220)), energy: +energy.toFixed(2), brightness: +brightness.toFixed(2) }
}

/** Decodes an audio file in the browser and listens to it. Returns null if the browser cannot read it. */
export async function listen(file: Blob): Promise<Heard | null> {
  try {
    const Offline = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
    if (!Offline) return null
    const ctx = new Offline(1, 44100, 44100)
    const audio = await ctx.decodeAudioData(await file.arrayBuffer())
    const mono = new Float32Array(audio.length)
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const d = audio.getChannelData(c)
      for (let i = 0; i < d.length; i++) mono[i] += d[i] / audio.numberOfChannels
    }
    return analyse(mono, audio.sampleRate)
  } catch {
    return null
  }
}

/** The tempo chip a measured song belongs to. */
export function tempoOf(bpm: number) {
  return bpm < 88 ? 'slow' : bpm < 116 ? 'mid' : 'fast'
}
