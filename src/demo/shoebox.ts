import assets from './assets.json'
// FICTIONAL DEMO "camera roll": small original SVG scenes for the demo person's October and
// November 2025, so the journal has something in it before you connect your own photos.

function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

const W = 800
const H = 1000

const wrap = (body: string, bg: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`

const scenes: Record<string, (r: () => number) => string> = {
  sunset: (r) => {
    const sun = 380 + r() * 200
    return wrap(
      `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B3A5A"/><stop offset=".45" stop-color="#C8643F"/><stop offset=".62" stop-color="#F1B66B"/><stop offset="1" stop-color="#2B2430"/></linearGradient></defs>
      <rect width="800" height="1000" fill="url(#s)"/>
      ${Array.from({ length: 7 }, (_, i) => `<ellipse cx="${r() * 800}" cy="${120 + i * 50 + r() * 40}" rx="${120 + r() * 160}" ry="${10 + r() * 14}" fill="#E9946A" opacity=".55"/>`).join('')}
      <circle cx="${sun}" cy="600" r="54" fill="#FFE2B0"/>
      <path d="M0 640 Q200 590 380 630 T800 610 L800 1000 L0 1000Z" fill="#2B2430"/>
      <rect y="700" width="800" height="300" fill="#3A3346"/>
      ${Array.from({ length: 14 }, (_, i) => `<rect x="${sun - 60 + r() * 120}" y="${712 + i * 18}" width="${30 + r() * 80}" height="3" fill="#F6C98B" opacity="${0.7 - i * 0.04}"/>`).join('')}`,
      '#2B2430',
    )
  },
  coffee: (r) =>
    wrap(
      `<rect width="800" height="1000" fill="#7A5638"/>
      ${Array.from({ length: 30 }, (_, i) => `<rect x="0" y="${i * 34}" width="800" height="2" fill="#6A4A30" opacity=".6"/>`).join('')}
      <ellipse cx="420" cy="560" rx="270" ry="250" fill="#000" opacity=".18"/>
      <circle cx="400" cy="520" r="250" fill="#EFE8DC"/><circle cx="400" cy="520" r="200" fill="#E2D8C8"/>
      <circle cx="400" cy="520" r="170" fill="#F4EEE4"/><circle cx="400" cy="520" r="150" fill="#9A6A42"/>
      <path d="M400 600 C${330 - r() * 20} 540 330 470 380 470 C395 470 400 485 400 495 C400 485 405 470 420 470 C470 470 ${470 + r() * 20} 540 400 600Z" fill="#F3E3CC"/>
      <rect x="640" y="430" width="90" height="34" rx="16" fill="#EFE8DC"/>
      <rect x="120" y="840" width="160" height="12" rx="6" fill="#C9B79C" transform="rotate(-18 200 846)"/>`,
      '#7A5638',
    ),
  rain: (r) =>
    wrap(
      `<defs><filter id="b"><feGaussianBlur stdDeviation="22"/></filter></defs>
      <g filter="url(#b)">${Array.from({ length: 16 }, () => `<circle cx="${r() * 800}" cy="${200 + r() * 700}" r="${80 + r() * 140}" fill="${['#5F7A4E', '#7E9A62', '#3F5A3A', '#A9B98C'][Math.floor(r() * 4)]}"/>`).join('')}</g>
      <rect width="800" height="1000" fill="#C9D3D8" opacity=".25"/>
      ${Array.from({ length: 140 }, () => {
        const x = r() * 800
        const y = r() * 1000
        const s = 3 + r() * 9
        return `<ellipse cx="${x}" cy="${y}" rx="${s * 0.7}" ry="${s}" fill="#EEF3F2" opacity=".55"/><ellipse cx="${x - s * 0.2}" cy="${y - s * 0.3}" rx="${s * 0.2}" ry="${s * 0.3}" fill="#fff" opacity=".8"/>`
      }).join('')}`,
      '#7E9A62',
    ),
  tulips: (r) =>
    wrap(
      `<rect width="800" height="1000" fill="#D9D3C7"/><rect y="760" width="800" height="240" fill="#B8AE9E"/>
      <path d="M300 760 Q280 620 340 560 L460 560 Q520 620 500 760Z" fill="#E8EEF0" opacity=".75"/>
      ${Array.from({ length: 9 }, (_, i) => {
        const x = 260 + i * 35 + r() * 20
        const y = 220 + r() * 160
        const c = ['#E7A9B8', '#D98AA0', '#F1C6CF'][i % 3]
        return `<path d="M400 600 Q${(x + 400) / 2} ${y + 200} ${x} ${y + 40}" stroke="#6F8A55" stroke-width="7" fill="none"/><path d="M${x - 30} ${y + 40} Q${x - 34} ${y - 30} ${x} ${y - 36} Q${x + 34} ${y - 30} ${x + 30} ${y + 40} Q${x} ${y + 60} ${x - 30} ${y + 40}Z" fill="${c}"/>`
      }).join('')}`,
      '#D9D3C7',
    ),
  lamp: (r) =>
    wrap(
      `<defs><radialGradient id="g" cx=".55" cy=".35" r=".6"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".9"/><stop offset="1" stop-color="#2A1E16" stop-opacity="0"/></radialGradient></defs>
      <rect width="800" height="1000" fill="#2A1E16"/>
      ${Array.from({ length: 3 }, (_, i) => `<rect x="60" y="${180 + i * 160}" width="260" height="10" fill="#5A3E2A"/>${Array.from({ length: 6 }, (_, j) => `<rect x="${70 + j * 40}" y="${110 + i * 160 + r() * 20}" width="${22 + r() * 12}" height="${60 + r() * 10}" fill="${['#8C5A3C', '#5D6B73', '#7A2E2E', '#A7803F'][Math.floor(r() * 4)]}"/>`).join('')}`).join('')}
      <rect width="800" height="1000" fill="url(#g)"/>
      <path d="M380 260 L520 260 L560 400 L340 400Z" fill="#E9C48C"/><rect x="445" y="400" width="10" height="320" fill="#3B2A1E"/>
      <ellipse cx="450" cy="730" rx="90" ry="18" fill="#3B2A1E"/><rect y="740" width="800" height="260" fill="#4A3324"/>`,
      '#2A1E16',
    ),
  rainbow: (r) =>
    wrap(
      `<defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FB3D6"/><stop offset="1" stop-color="#DCE7EE"/></linearGradient></defs>
      <rect width="800" height="1000" fill="url(#k)"/>
      ${['#E58C8A', '#F0B57A', '#F1DE8A', '#9CCB8C', '#8DB6DA', '#A99AD0'].map((c, i) => `<path d="M-40 700 A${460 - i * 16} ${400 - i * 16} 0 0 1 ${840} 700" stroke="${c}" stroke-width="16" fill="none" opacity=".55"/>`).join('')}
      <path d="M0 640 Q250 600 520 650 T800 630 L800 1000 L0 1000Z" fill="#7E9A62"/>
      <rect y="760" width="800" height="240" fill="#6A8752"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 70}" y="730" width="8" height="${70 + r() * 6}" fill="#F4F1EA"/>`).join('')}
      <rect y="752" width="800" height="7" fill="#F4F1EA"/><rect y="782" width="800" height="7" fill="#F4F1EA"/>`,
      '#8FB3D6',
    ),
  book: (r) =>
    wrap(
      `<rect width="800" height="1000" fill="#E8E1D6"/>
      ${Array.from({ length: 10 }, () => `<path d="M${r() * 800} ${r() * 1000} q${120 + r() * 120} ${-40 + r() * 80} ${260 + r() * 120} 0" stroke="#D4CBBE" stroke-width="${10 + r() * 20}" fill="none" stroke-linecap="round"/>`).join('')}
      <g transform="rotate(${-10 + r() * 8} 400 520)"><path d="M120 360 Q260 330 400 380 L400 720 Q260 670 120 700Z" fill="#F7F2E8"/><path d="M680 360 Q540 330 400 380 L400 720 Q540 670 680 700Z" fill="#FBF7EF"/>
      ${Array.from({ length: 10 }, (_, i) => `<line x1="150" y1="${400 + i * 28}" x2="370" y2="${410 + i * 28}" stroke="#B9AE9E" stroke-width="3"/><line x1="430" y1="${410 + i * 28}" x2="650" y2="${400 + i * 28}" stroke="#B9AE9E" stroke-width="3"/>`).join('')}</g>`,
      '#E8E1D6',
    ),
  city: (r) =>
    wrap(
      `<rect width="800" height="1000" fill="#141A26"/>
      ${Array.from({ length: 9 }, (_, i) => {
        const h = 300 + r() * 420
        const x = i * 92 - 10
        return `<rect x="${x}" y="${1000 - h}" width="86" height="${h}" fill="#1E2636"/>${Array.from({ length: 30 }, () => (r() > 0.55 ? `<rect x="${x + 8 + Math.floor(r() * 4) * 19}" y="${1000 - h + 14 + Math.floor(r() * (h / 26)) * 26}" width="10" height="14" fill="#E8C47A" opacity="${0.5 + r() * 0.5}"/>` : '')).join('')}`
      }).join('')}
      <circle cx="${560 + r() * 120}" cy="160" r="40" fill="#F1EAD6" opacity=".9"/>`,
      '#141A26',
    ),
  leaves: (r) =>
    wrap(
      `<rect width="800" height="1000" fill="#6B4A2B"/>
      ${Array.from({ length: 160 }, () => {
        const x = r() * 800
        const y = r() * 1000
        const s = 18 + r() * 30
        const c = ['#C8642F', '#D98B3A', '#A9462A', '#E2A64A', '#8F3A22'][Math.floor(r() * 5)]
        return `<path transform="translate(${x} ${y}) rotate(${r() * 360}) scale(${s / 20})" d="M0-20C9-14 12-4 0 20C-12-4-9-14 0-20Z" fill="${c}"/>`
      }).join('')}`,
      '#6B4A2B',
    ),
}

/** The demo person's roll comes from the shared asset map (scripts/assets.py). */
type RollAsset = { id: string; group: string; file: string; date: string; time: string; scene: keyof typeof scenes; caption: string }
const ROLL = (assets as unknown as RollAsset[]).filter((a) => a.group === 'roll')

export function demoRoll() {
  return ROLL.map((a, i) => ({
    date: a.date,
    takenAt: new Date(`${a.date}T${a.time}:00`).toISOString(),
    caption: a.caption || undefined,
    key: `demo:${i}`,
    name: a.file,
    svg: (scenes[a.scene] ?? scenes.coffee)(rng(i * 977 + 13)),
  }))
}
