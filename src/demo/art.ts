// Original illustrations drawn for the fictional demo memories. 1200×800, 3:2 like a 35mm frame.

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

function leaves(n: number, seed: number, area: [number, number, number, number], colors: string[], size = 18) {
  const r = rng(seed)
  let out = ''
  for (let i = 0; i < n; i++) {
    const x = area[0] + r() * area[2]
    const y = area[1] + r() * area[3]
    const s = size * (0.6 + r() * 0.8)
    const rot = r() * 360
    const c = colors[Math.floor(r() * colors.length)]
    out += `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${(s / 20).toFixed(2)})" d="M0-20C9-14 12-4 0 20C-12-4-9-14 0-20Z" fill="${c}" opacity="${(0.75 + r() * 0.25).toFixed(2)}"/>`
  }
  return out
}

const autumn = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1D9B0"/><stop offset=".6" stop-color="#E9B884"/><stop offset="1" stop-color="#D99A68"/></linearGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9C7A45"/><stop offset="1" stop-color="#6B4A2B"/></linearGradient>
<radialGradient id="sun" cx=".72" cy=".28" r=".5"><stop offset="0" stop-color="#FFF1D2" stop-opacity=".9"/><stop offset="1" stop-color="#FFF1D2" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="800" fill="url(#sky)"/>
<rect width="1200" height="800" fill="url(#sun)"/>
<g fill="#7B5A3C" opacity=".55"><rect x="90" y="190" width="16" height="330"/><rect x="980" y="160" width="20" height="360"/><rect x="640" y="230" width="12" height="280"/></g>
<g opacity=".9">${leaves(140, 3, [-40, 40, 360, 260], ['#C8642F', '#D98B3A', '#A9462A', '#E2A64A'], 34)}${leaves(160, 9, [820, 20, 420, 280], ['#C8642F', '#E2A64A', '#B8532B', '#9E3E26'], 36)}${leaves(70, 21, [540, 110, 220, 200], ['#D98B3A', '#E9B44E', '#C8642F'], 26)}</g>
<path d="M0 500 Q600 450 1200 500 L1200 800 L0 800Z" fill="url(#ground)"/>
<path d="M430 800 Q560 560 640 500 Q700 520 860 800Z" fill="#C9A06A" opacity=".55"/>
<ellipse cx="250" cy="560" rx="170" ry="26" fill="#4E6670" opacity=".55"/>
<g transform="translate(700 470)">
<rect x="0" y="0" width="330" height="18" rx="3" fill="#3F5A43"/>
<rect x="0" y="26" width="330" height="18" rx="3" fill="#3F5A43"/>
<rect x="0" y="62" width="330" height="16" rx="3" fill="#36503A"/>
<rect x="18" y="44" width="12" height="80" fill="#2C2620"/><rect x="300" y="44" width="12" height="80" fill="#2C2620"/>
<rect x="140" y="6" width="54" height="14" fill="#C9A14A"/>
</g>
<g transform="translate(760 470)"><path d="M10 0 Q0 -60 30 -70 Q60 -60 50 0Z" fill="#D2A33B"/><circle cx="30" cy="-86" r="18" fill="#7B5236"/></g>
<g transform="translate(860 470)"><path d="M6 0 Q0 -66 28 -76 Q58 -66 52 0Z" fill="#3F4A5C"/><circle cx="28" cy="-92" r="18" fill="#4A3426"/></g>
<g transform="translate(950 470)"><path d="M6 0 Q0 -58 26 -68 Q54 -60 48 0Z" fill="#7A2E2E"/><circle cx="27" cy="-84" r="17" fill="#2E241D"/></g>
<g>${leaves(220, 44, [0, 520, 1200, 280], ['#C8642F', '#D98B3A', '#A9462A', '#E2A64A', '#8F3A22'], 22)}</g>
<g transform="translate(120 640)">
<path d="M0 0 L16 110 L84 110 L100 0Z" fill="#F4EBDD"/><rect x="-4" y="-12" width="108" height="16" rx="4" fill="#E6DACA"/><rect x="10" y="34" width="80" height="26" fill="#B4664A"/>
<path d="M140 10 L154 112 L216 112 L230 10Z" fill="#F4EBDD"/><rect x="136" y="0" width="98" height="14" rx="4" fill="#E6DACA"/><rect x="150" y="44" width="70" height="24" fill="#B4664A"/>
</g>
</svg>`

const ambition = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
<defs>
<radialGradient id="lamp" cx=".7" cy=".45" r=".55"><stop offset="0" stop-color="#FFE7B8" stop-opacity=".95"/><stop offset=".55" stop-color="#E9C88F" stop-opacity=".35"/><stop offset="1" stop-color="#2D2A2A" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="800" fill="#3B3633"/>
<rect x="80" y="70" width="330" height="380" fill="#1E2433"/>
<rect x="80" y="70" width="330" height="380" fill="none" stroke="#D8CBB5" stroke-width="14"/>
<line x1="245" y1="70" x2="245" y2="450" stroke="#D8CBB5" stroke-width="8"/><line x1="80" y1="260" x2="410" y2="260" stroke="#D8CBB5" stroke-width="8"/>
<g fill="#F2D49A">${Array.from({ length: 18 }, (_, i) => `<circle cx="${100 + ((i * 97) % 300)}" cy="${100 + ((i * 53) % 330)}" r="${1 + (i % 3)}"/>`).join('')}</g>
<rect x="480" y="90" width="210" height="280" fill="#E9DFCC" transform="rotate(-3 585 230)"/>
<text x="500" y="150" font-family="Georgia, serif" font-size="46" fill="#7A2E2E" transform="rotate(-3 585 230)">2019</text>
<g stroke="#9C8E78" stroke-width="3" transform="rotate(-3 585 230)">${Array.from({ length: 5 }, (_, i) => `<line x1="500" y1="${190 + i * 34}" x2="670" y2="${190 + i * 34}"/>`).join('')}</g>
<rect x="740" y="120" width="120" height="160" fill="#B4664A" transform="rotate(4 800 200)"/>
<rect x="760" y="150" width="80" height="6" fill="#F2E7D4" transform="rotate(4 800 200)"/>
<rect width="1200" height="800" fill="url(#lamp)"/>
<rect x="0" y="520" width="1200" height="280" fill="#6B4A33"/>
<rect x="0" y="520" width="1200" height="14" fill="#7E5A3F"/>
<g transform="translate(860 300)"><path d="M0 0 L120 -40 L150 20 L40 60Z" fill="#2C2622"/><rect x="60" y="20" width="10" height="200" fill="#2C2622" transform="rotate(10 65 120)"/><ellipse cx="90" cy="226" rx="70" ry="14" fill="#2C2622"/></g>
<g transform="translate(330 560) rotate(-6)">
<rect x="0" y="0" width="520" height="190" fill="#F6F0E4"/>
<line x1="260" y1="0" x2="260" y2="190" stroke="#CFC2AA" stroke-width="3"/>
<g stroke="#C9D4DE" stroke-width="2">${Array.from({ length: 7 }, (_, i) => `<line x1="14" y1="${30 + i * 22}" x2="246" y2="${30 + i * 22}"/><line x1="274" y1="${30 + i * 22}" x2="506" y2="${30 + i * 22}"/>`).join('')}</g>
<g fill="none" stroke="#2B3A67" stroke-width="2.4" stroke-linecap="round">${Array.from({ length: 6 }, (_, i) => `<path d="M20 ${26 + i * 22} q14 -10 28 0 t28 0 t28 0 t28 0 t28 0 t${20 + (i % 3) * 10} 0"/>`).join('')}${Array.from({ length: 4 }, (_, i) => `<path d="M280 ${26 + i * 22} q14 -10 28 0 t28 0 t28 0 t${18 + (i % 2) * 18} 0"/>`).join('')}</g>
<text x="300" y="150" font-family="Georgia, serif" font-style="italic" font-size="22" fill="#7A2E2E">before 25?</text>
</g>
<g transform="translate(900 640) rotate(-28)"><rect x="0" y="0" width="190" height="12" fill="#E2B33B"/><path d="M190 0 L216 6 L190 12Z" fill="#E8C9A0"/><rect x="-14" y="0" width="14" height="12" fill="#C46A6A"/></g>
<g transform="translate(120 600)"><rect x="0" y="0" width="120" height="110" rx="6" fill="#F2EEE6"/><path d="M120 24 q36 6 0 50" fill="none" stroke="#F2EEE6" stroke-width="14"/><text x="18" y="70" font-family="Georgia, serif" font-size="30" fill="#7A2E2E">♡</text></g>
</svg>`

const night = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
<defs>
<radialGradient id="glow" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#C7D0B2" stop-opacity=".55"/><stop offset="1" stop-color="#0F1110" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="800" fill="#121413"/>
<rect x="840" y="40" width="320" height="300" fill="#1B2330"/>
<g fill="#E8C47A" opacity=".85">${Array.from({ length: 34 }, (_, i) => `<rect x="${860 + ((i * 71) % 280)}" y="${150 + ((i * 37) % 170)}" width="${6 + (i % 3) * 3}" height="${8 + (i % 2) * 4}"/>`).join('')}</g>
<g fill="#0D1016">${[0, 1, 2, 3, 4].map((i) => `<rect x="${850 + i * 64}" y="${140 + (i % 3) * 30}" width="52" height="${220 - (i % 3) * 30}" opacity=".7"/>`).join('')}</g>
<rect x="840" y="40" width="320" height="300" fill="none" stroke="#2B2F2C" stroke-width="12"/>
<rect width="1200" height="800" fill="url(#glow)"/>
<rect x="300" y="120" width="560" height="350" rx="10" fill="#1E211F"/>
<rect x="318" y="138" width="524" height="314" fill="#0E1A14"/>
<g font-family="Menlo, monospace" font-size="15">
${['$ npm run build', '  ✓ 214 modules transformed', '  ✗ ENOENT: no such file or directory', "    open './src/assets'", '$ git commit -m "please"', '$ git commit -m "please please"', '  [main 7f3a2c1] fix: missing slash', '$ ./deploy.sh', '  uploading… 98%', '  ✓ submitted 05:12'].map((l, i) => `<text x="336" y="${172 + i * 27}" fill="${l.includes('✗') ? '#D98270' : l.includes('✓') ? '#B9C98F' : '#9FB49A'}">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`).join('')}
</g>
<rect x="540" y="470" width="80" height="50" fill="#1E211F"/>
<rect x="0" y="560" width="1200" height="240" fill="#2A2420"/>
<rect x="0" y="560" width="1200" height="10" fill="#3A322C"/>
<g transform="translate(330 600)"><rect x="0" y="0" width="500" height="22" rx="4" fill="#3C403C"/><g fill="#555A55">${Array.from({ length: 14 }, (_, i) => `<rect x="${12 + i * 34}" y="5" width="26" height="12" rx="2"/>`).join('')}</g></g>
<g transform="translate(150 520)">${[0, 1, 2].map((i) => `<g transform="translate(${i * 56} ${i === 1 ? 30 : 0}) rotate(${i === 2 ? 80 : 0} 22 50)"><rect x="0" y="0" width="44" height="96" rx="8" fill="#5D6B73"/><rect x="0" y="30" width="44" height="34" fill="#C9C1B1"/><text x="8" y="53" font-family="Arial" font-size="12" font-weight="700" fill="#2A2420">COLD</text></g>`).join('')}</g>
<g transform="translate(910 610)"><path d="M0 60 Q0 0 60 0 Q120 0 120 60" fill="none" stroke="#3A3A3A" stroke-width="12"/><rect x="-14" y="50" width="28" height="44" rx="10" fill="#4A4A48"/><rect x="106" y="50" width="28" height="44" rx="10" fill="#4A4A48"/></g>
<g transform="translate(700 90) rotate(6)"><rect x="0" y="0" width="110" height="100" fill="#E7D36B"/><text x="14" y="58" font-family="Arial" font-weight="900" font-size="26" fill="#2A2420">SHIP IT</text></g>
<g transform="translate(80 80)"><circle cx="70" cy="70" r="70" fill="#E8E2D6"/><circle cx="70" cy="70" r="62" fill="#F4F0E8"/><line x1="70" y1="70" x2="70" y2="26" stroke="#222" stroke-width="5" transform="rotate(112 70 70)"/><line x1="70" y1="70" x2="70" y2="20" stroke="#222" stroke-width="3" transform="rotate(282 70 70)"/><circle cx="70" cy="70" r="5" fill="#7A2E2E"/></g>
</svg>`

const ART: Record<string, () => string> = { autumn, ambition, night }

const cache = new Map<string, string>()
export function artUrl(key: string) {
  if (!cache.has(key)) cache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent((ART[key] ?? autumn)()))
  return cache.get(key)!
}

/** A photogram for memories without a photo: objects laid on paper, seeded by the memory. */
export function photogramUrl(seed: number, accent: string, labels: string[]) {
  const r = rng(seed || 7)
  let shapes = ''
  for (let i = 0; i < 9; i++) {
    const x = 80 + r() * 1040
    const y = 80 + r() * 640
    const k = Math.floor(r() * 4)
    const s = 40 + r() * 140
    const o = (0.25 + r() * 0.55).toFixed(2)
    if (k === 0) shapes += `<circle cx="${x}" cy="${y}" r="${s / 2}" fill="#1E1A17" opacity="${o}"/>`
    else if (k === 1) shapes += `<rect x="${x}" y="${y}" width="${s * 1.6}" height="${s}" fill="#1E1A17" opacity="${o}" transform="rotate(${r() * 40 - 20} ${x} ${y})"/>`
    else if (k === 2) shapes += `<path transform="translate(${x} ${y}) rotate(${r() * 360}) scale(${s / 40})" d="M0-20C9-14 12-4 0 20C-12-4-9-14 0-20Z" fill="#1E1A17" opacity="${o}"/>`
    else shapes += `<line x1="${x}" y1="${y}" x2="${x + s * 2}" y2="${y + s * (r() - 0.5)}" stroke="#1E1A17" stroke-width="${2 + r() * 6}" opacity="${o}"/>`
  }
  const words = labels
    .slice(0, 5)
    .map((w, i) => `<text x="${90 + r() * 700}" y="${140 + i * 130}" font-family="Georgia, serif" font-style="italic" font-size="${34 + r() * 30}" fill="#1E1A17" opacity=".55">${w.replace(/[<&]/g, '')}</text>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#EFE6D6"/><rect width="1200" height="800" fill="${accent}" opacity=".28"/>${shapes}${words}</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
