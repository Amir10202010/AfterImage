// The day card as a picture: the same constant frame as DayCard (4:5, the 12-column photo window,
// date on top, folder name and quoted line below, the song tag and the mark at the foot), drawn on a
// canvas at 1080×1350 so it can be kept in the day folder. The moving parts (slideshow, pulse, Ken
// Burns, weather) are a still here: each frame shows its first photo.
import type { CardModel, Mark } from './daycard'

const W = 1080
const H = 1350
const PAD = W * 0.06
const WIN = { x: W * (0.06 + 0.88 / 12), y: H * 0.105, w: W * ((0.88 * 10) / 12), h: H * 0.56 }
const cq = (n: number) => (W * n) / 100

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function load(src: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(undefined)
    img.src = src
  })
}

/** Draws img to cover the box, like object-fit: cover with an object-position. */
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, focus = '50% 50%') {
  const [fx, fy] = focus.split(' ').map((p) => parseFloat(p) / 100)
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / s
  const sh = h / s
  const sx = (img.naturalWidth - sw) * (isNaN(fx) ? 0.5 : fx)
  const sy = (img.naturalHeight - sh) * (isNaN(fy) ? 0.5 : fy)
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, maxLines = 99) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (ctx.measureText(t).width > max && line) {
      lines.push(line)
      line = w
    } else line = t
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    let last = kept[maxLines - 1]
    while (ctx.measureText(last + '…').width > max && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '))
    kept[maxLines - 1] = last + '…'
    return kept
  }
  return lines
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

function drawMarks(ctx: CanvasRenderingContext2D, marks: Mark[]) {
  const k = W / 100 // the marks' viewBox is 0 0 100 125
  for (const m of marks) {
    ctx.save()
    switch (m.kind) {
      case 'circle':
        ctx.beginPath()
        ctx.arc(m.x * k, m.y * k, m.r * k, 0, Math.PI * 2)
        if (m.fill) {
          ctx.fillStyle = m.fill
          ctx.fill()
        }
        if (m.stroke) {
          ctx.strokeStyle = m.stroke
          ctx.lineWidth = (m.width ?? 0.5) * k
          ctx.stroke()
        }
        break
      case 'line':
        ctx.beginPath()
        ctx.moveTo(m.x1 * k, m.y1 * k)
        ctx.lineTo(m.x2 * k, m.y2 * k)
        ctx.strokeStyle = m.stroke
        ctx.lineWidth = m.width * k
        ctx.stroke()
        break
      case 'rect':
        ctx.globalAlpha = m.opacity ?? 1
        ctx.translate((m.x + m.w / 2) * k, (m.y + m.h / 2) * k)
        if (m.rotate) ctx.rotate((m.rotate * Math.PI) / 180)
        ctx.fillStyle = m.fill
        ctx.fillRect((-m.w / 2) * k, (-m.h / 2) * k, m.w * k, m.h * k)
        break
      case 'dab':
        ctx.globalAlpha = 0.55
        ctx.globalCompositeOperation = 'soft-light'
        ctx.filter = `blur(${2.4 * k}px)`
        ctx.beginPath()
        ctx.arc(m.x * k, m.y * k, m.r * k, 0, Math.PI * 2)
        ctx.fillStyle = m.fill
        ctx.fill()
        break
      case 'lamp': {
        const g = ctx.createRadialGradient(m.x * k, m.y * k, 0, m.x * k, m.y * k, m.r * 3 * k)
        g.addColorStop(0, m.fill)
        g.addColorStop(1, 'transparent')
        ctx.globalAlpha = 0.45
        ctx.fillStyle = g
        ctx.fillRect((m.x - m.r * 3) * k, (m.y - m.r * 3) * k, m.r * 6 * k, m.r * 6 * k)
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(m.x * k, m.y * k, m.r * k, 0, Math.PI * 2)
        ctx.fillStyle = m.fill
        ctx.fill()
        break
      }
    }
    ctx.restore()
  }
}

/** Renders the card to a PNG. `photos[i]` is a URL for photo i (blob:, data: or same-origin). */
export async function renderCardPng(card: CardModel, photos: string[], date: string): Promise<Blob | undefined> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined
  const style = card.style as Record<string, string>
  const paper = style['--dc-paper'] ?? '#f4efe6'
  const ink = style['--dc-ink'] ?? '#26221e'
  const accent = style['--dc-accent'] ?? '#9b3b2f'
  const second = style['--dc-second'] ?? '#555'
  const shade = style['--dc-shadow'] ?? '#333'
  const serif = cssVar('--serif', 'Georgia, serif')
  const mono = cssVar('--mono', 'ui-monospace, monospace')
  const sans = cssVar('--sans', 'system-ui, sans-serif')
  const tech = card.technique
  try {
    await Promise.all([document.fonts.load(`500 ${cq(6.6)}px ${serif}`), document.fonts.load(`italic 400 ${cq(3.5)}px ${serif}`), document.fonts.load(`500 ${cq(2.5)}px ${mono}`), document.fonts.load(`700 ${cq(6)}px ${sans}`)])
  } catch {
    /* fall back to whatever is installed */
  }
  const imgs = await Promise.all(photos.map(load))

  // paper
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)

  // the photo window, drawn off-screen so impression can soften its edges
  const win = document.createElement('canvas')
  win.width = Math.round(WIN.w)
  win.height = Math.round(WIN.h)
  const w = win.getContext('2d')!
  // back to front: in DayCard the first frame sits on top
  ;[...card.frames].reverse().forEach((f) => {
    const x = (f.x / 100) * WIN.w
    const y = (f.y / 100) * WIN.h
    const fw = (f.w / 100) * WIN.w
    const fh = (f.h / 100) * WIN.h
    w.save()
    w.translate(x + fw / 2, y + fh / 2)
    if (f.rotate) w.rotate((f.rotate * Math.PI) / 180)
    w.translate(-fw / 2, -fh / 2)
    let ix = 0
    let iy = 0
    let iw = fw
    let ih = fh
    if (tech === 'collage') {
      w.shadowColor = 'rgba(0,0,0,0.45)'
      w.shadowBlur = cq(2.5)
      w.shadowOffsetY = cq(1.5)
      w.fillStyle = '#fffdf6'
      w.fillRect(0, 0, fw, fh)
      w.shadowColor = 'transparent'
      const b = cq(1.4)
      ix = b
      iy = b
      iw = fw - 2 * b
      ih = fh - 2 * b
    } else if (tech === 'film') {
      w.shadowColor = 'rgba(0,0,0,0.4)'
      w.shadowBlur = cq(3)
      w.shadowOffsetY = cq(2)
      w.fillStyle = '#fbf7ee'
      w.fillRect(0, 0, fw, fh)
      w.shadowColor = 'transparent'
      ix = fw * 0.03
      iy = fh * 0.03
      iw = fw * 0.94
      ih = fh * 0.85
    } else if (tech !== 'ma') {
      w.fillStyle = tech === 'impression' ? second : shade
      w.fillRect(0, 0, fw, fh)
    }
    const img = imgs[f.photo] ?? imgs[0]
    if (img) {
      w.filter = card.atm.treatment.filter
      cover(w, img, ix, iy, iw, ih, f.focus)
      w.filter = 'none'
    } else {
      w.fillStyle = second
      w.fillRect(ix, iy, iw, ih)
    }
    if (tech === 'film') {
      w.font = `600 ${cq(2.4)}px ${mono}`
      w.fillStyle = '#ff8a3c'
      w.textAlign = 'right'
      w.fillText("'" + date.slice(2).replace(/-/g, ' '), fw * 0.93, fh * 0.85)
    }
    w.restore()
  })
  if (tech === 'kandinsky') {
    w.strokeStyle = ink
    w.globalAlpha = 0.18
    w.lineWidth = 1
    w.beginPath()
    for (let i = 1; i < 10; i++) {
      w.moveTo((WIN.w * i) / 10, 0)
      w.lineTo((WIN.w * i) / 10, WIN.h)
    }
    for (let i = 1; i < 8; i++) {
      w.moveTo(0, (WIN.h * i) / 8)
      w.lineTo(WIN.w, (WIN.h * i) / 8)
    }
    w.stroke()
    w.globalAlpha = 1
  }
  if (tech === 'film') {
    const g = w.createRadialGradient(WIN.w * 0.9, WIN.h * 0.1, 0, WIN.w * 0.9, WIN.h * 0.1, WIN.w * 0.45)
    g.addColorStop(0, 'rgba(255,120,50,0.5)')
    g.addColorStop(0.6, 'rgba(255,60,40,0.15)')
    g.addColorStop(1, 'rgba(255,60,40,0)')
    w.globalCompositeOperation = 'screen'
    w.fillStyle = g
    w.fillRect(0, 0, WIN.w, WIN.h)
    w.globalCompositeOperation = 'source-over'
  }
  if (tech === 'impression') {
    const g = w.createRadialGradient(WIN.w / 2, WIN.h / 2, 0, WIN.w / 2, WIN.h / 2, Math.max(WIN.w, WIN.h) * 0.62)
    g.addColorStop(0.62 * 0.72, 'rgba(0,0,0,1)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    w.globalCompositeOperation = 'destination-in'
    w.fillStyle = g
    w.fillRect(0, 0, WIN.w, WIN.h)
    w.globalCompositeOperation = 'source-over'
  }
  if (tech === 'collage' && card.keyword) {
    w.font = `400 ${cq(4.6)}px ${cssVar('--type', mono)}`
    const tw = w.measureText(card.keyword).width
    const bx = WIN.w * 1.02 - tw - cq(3.6)
    const by = WIN.h * 0.94 - cq(5.8)
    w.save()
    w.translate(bx, by)
    w.rotate((-4 * Math.PI) / 180)
    w.fillStyle = accent
    w.fillRect(0, 0, tw + cq(3.6), cq(5.8))
    w.fillStyle = '#fff'
    w.textBaseline = 'middle'
    w.fillText(card.keyword, cq(1.8), cq(2.9))
    w.restore()
  }
  ctx.drawImage(win, WIN.x, WIN.y)

  drawMarks(ctx, card.marks)

  // the constant frame: date, folder name, quoted line, the foot
  ctx.fillStyle = ink
  ctx.textBaseline = 'top'
  ctx.globalAlpha = 0.85
  ctx.font = `500 ${cq(2.5)}px ${mono}`
  ctx.letterSpacing = `${cq(2.5) * 0.14}px`
  ctx.fillText(card.dateLine.toUpperCase(), PAD, H * 0.046)
  ctx.letterSpacing = '0px'
  ctx.globalAlpha = 1

  const titleSize = tech === 'kandinsky' ? cq(6) : tech === 'ma' ? cq(5.6) : cq(6.6)
  ctx.font = tech === 'kandinsky' ? `700 ${titleSize}px ${sans}` : `${tech === 'ma' ? 400 : 500} ${titleSize}px ${serif}`
  const titleLines = wrap(ctx, card.title, W - 2 * PAD)
  ctx.font = `italic 400 ${cq(3.5)}px ${serif}`
  const capLines = card.caption ? wrap(ctx, `“${card.caption}”`, (W - 2 * PAD) * 0.92, 2) : []
  const bottom = H * (1 - 0.115)
  const capH = capLines.length * cq(3.5) * 1.32
  const gap = capLines.length ? cq(1.6) : 0
  const titleH = titleLines.length * titleSize * 1.02
  let y = bottom - capH - gap - titleH
  ctx.textBaseline = 'top'
  ctx.font = tech === 'kandinsky' ? `700 ${titleSize}px ${sans}` : `${tech === 'ma' ? 400 : 500} ${titleSize}px ${serif}`
  for (const l of titleLines) {
    ctx.fillText(l, PAD, y)
    y += titleSize * 1.02
  }
  y += gap
  ctx.globalAlpha = 0.86
  ctx.font = `italic 400 ${cq(3.5)}px ${serif}`
  for (const l of capLines) {
    ctx.fillText(l, PAD, y)
    y += cq(3.5) * 1.32
  }
  ctx.globalAlpha = 1

  ctx.font = `500 ${cq(2.1)}px ${mono}`
  ctx.letterSpacing = `${cq(2.1) * 0.08}px`
  ctx.textBaseline = 'alphabetic'
  const footY = H * (1 - 0.038)
  ctx.globalAlpha = 0.6
  ctx.fillText('◇ afterimage', PAD, footY)
  ctx.globalAlpha = 1
  if (card.song) {
    ctx.textAlign = 'right'
    ctx.fillStyle = accent
    const max = (W - 2 * PAD) * 0.62
    ctx.fillText(ellipsize(ctx, card.song.meta, max), W - PAD, footY)
    ctx.fillText(ellipsize(ctx, '♪ ' + card.song.name, max), W - PAD, footY - cq(2.1) * 1.2 - cq(0.6))
    ctx.textAlign = 'left'
  }
  ctx.letterSpacing = '0px'

  // grain
  const amount = card.atm.grain
  if (amount > 0.02) {
    const n = document.createElement('canvas')
    n.width = 270
    n.height = 338
    const nc = n.getContext('2d')!
    const data = nc.createImageData(n.width, n.height)
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.random() * 255
      data.data[i] = data.data[i + 1] = data.data[i + 2] = v
      data.data[i + 3] = 255
    }
    nc.putImageData(data, 0, 0)
    ctx.globalAlpha = Math.min(0.35, amount * 0.6)
    ctx.globalCompositeOperation = 'overlay'
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(n, 0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? undefined), 'image/png'))
}
