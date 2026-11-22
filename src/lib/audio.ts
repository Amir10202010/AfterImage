// Listens to the user's own audio file, on the device, and measures how it moves:
// its tempo (bpm) and its energy. Nothing is uploaded; only the two numbers are kept.
//
// The method is deliberately simple and explainable:
//   1. mix down to mono and take ~45 seconds after a short intro;
//   2. turn the signal into a loudness envelope, 100 frames per second;
//   3. keep only the rises (onsets: drums, plucks, the start of each note);
//   4. find the repeat period of the onsets by autocorrelation → bpm;
//   5. energy = how loud the track is + how punchy (how much the envelope jumps).
import type { Tempo } from './types'

export interface AudioReading {
  bpm: number
  /** 0 … 1 */
  energy: number
  /** 0 … 1: how sure the tempo is; under ~0.15 the track has no clear beat */
  confidence: number
  /** seconds actually listened to */
  seconds: number
}

const FPS = 100
const MIN_BPM = 60
const MAX_BPM = 180

/** Measures tempo and energy from raw mono samples. Pure, so it can be tested without a browser. */
export function analyzePcm(samples: Float32Array, sampleRate: number): AudioReading {
  const hop = Math.max(1, Math.round(sampleRate / FPS))
  const frames = Math.floor(samples.length / hop)
  const env = new Float32Array(frames)
  let sumSq = 0
  for (let f = 0; f < frames; f++) {
    let e = 0
    const o = f * hop
    for (let i = 0; i < hop; i++) {
      const x = samples[o + i]
      e += x * x
    }
    sumSq += e
    env[f] = Math.sqrt(e / hop)
  }
  const rms = Math.sqrt(sumSq / Math.max(1, frames * hop))

  // onsets: positive change of the log-envelope, so quiet and loud tracks are treated alike
  const onset = new Float32Array(frames)
  for (let f = 1; f < frames; f++) onset[f] = Math.max(0, Math.log1p(env[f] * 100) - Math.log1p(env[f - 1] * 100))
  let mean = 0
  for (let f = 0; f < frames; f++) mean += onset[f]
  mean /= Math.max(1, frames)
  for (let f = 0; f < frames; f++) onset[f] = Math.max(0, onset[f] - mean)

  // autocorrelation over the lags of 60–180 bpm, with a gentle preference for ~110 bpm
  // (tempo pickers lean towards the middle; it resolves "is it 70 or 140?" sensibly)
  const minLag = Math.floor((60 * FPS) / MAX_BPM)
  const maxLag = Math.ceil((60 * FPS) / MIN_BPM)
  const ac = new Float32Array(maxLag + 2)
  let zero = 0
  for (let f = 0; f < frames; f++) zero += onset[f] * onset[f]
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    let s = 0
    for (let f = lag; f < frames; f++) s += onset[f] * onset[f - lag]
    ac[lag] = s
  }
  let best = minLag
  let bestScore = -Infinity
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * FPS) / lag
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 110) / 0.9, 2))
    const score = ac[lag] * (0.6 + 0.4 * prior)
    if (score > bestScore) [best, bestScore] = [lag, score]
  }
  // parabolic interpolation around the peak for sub-frame precision
  const a = ac[best - 1]
  const b = ac[best]
  const c = ac[best + 1]
  const shift = a - 2 * b + c !== 0 ? (0.5 * (a - c)) / (a - 2 * b + c) : 0
  const lag = best + Math.max(-0.5, Math.min(0.5, shift))
  const bpm = Math.round(((60 * FPS) / lag) * 10) / 10
  const confidence = zero > 0 ? Math.max(0, Math.min(1, b / zero)) : 0

  // energy: loudness (−36 dBFS → 0, −9 dBFS → 1) and punch (onset strength vs. the envelope)
  const db = 20 * Math.log10(rms + 1e-9)
  const loud = Math.max(0, Math.min(1, (db + 36) / 27))
  let envMean = 0
  for (let f = 0; f < frames; f++) envMean += env[f]
  envMean /= Math.max(1, frames)
  let punch = 0
  for (let f = 0; f < frames; f++) punch += onset[f]
  punch = Math.max(0, Math.min(1, (punch / Math.max(1, frames)) * 18))
  const energy = Math.round(Math.max(0, Math.min(1, 0.6 * loud + 0.4 * punch)) * 100) / 100

  return { bpm, energy, confidence: Math.round(confidence * 100) / 100, seconds: Math.round(samples.length / sampleRate) }
}

/** Which of the three existing "how it felt" chips a bpm belongs to. */
export function tempoFromBpm(bpm: number): Tempo {
  return bpm < 86 ? 'slow' : bpm < 112 ? 'mid' : 'fast'
}

/** Decodes an audio file in the browser and measures it. Rejects if the browser can't decode the format. */
export async function analyzeAudioFile(file: Blob, opts: { skip?: number; listen?: number } = {}): Promise<AudioReading> {
  const skip = opts.skip ?? 8
  const listen = opts.listen ?? 45
  const data = await file.arrayBuffer()
  const Ctx = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext
  // a decoding context: decodeAudioData resamples to its rate; 22 050 Hz is plenty for rhythm
  const ctx = new Ctx(1, 1, 22050)
  const buf = await ctx.decodeAudioData(data)
  const sr = buf.sampleRate
  // skip the intro if the track is long enough to have one
  const start = buf.duration > skip + 20 ? Math.floor(skip * sr) : 0
  const end = Math.min(buf.length, start + Math.floor(listen * sr))
  const mono = new Float32Array(end - start)
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = start; i < end; i++) mono[i - start] += d[i] / buf.numberOfChannels
  }
  return analyzePcm(mono, sr)
}
