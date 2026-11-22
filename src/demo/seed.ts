// FICTIONAL DEMONSTRATION CONTENT.
// The person, friends, songs and artists below are invented for this demo.
import type { Letter, Memory } from '../lib/types'

const DAY = 86400000

const base = {
  demo: true,
  photoIds: [] as string[],
  progress: { done: {} },
  ledger: {},
  margin: [],
}

export function buildDemo(now: Date): { memories: Memory[]; letters: Letter[] } {
  const created = now.toISOString()

  const autumn: Memory = {
    ...base,
    id: 'demo-autumn',
    title: 'The Autumn Afternoon',
    date: '2025-10-12',
    time: '14:00',
    location: 'Linden Park',
    people: ['Mira', 'Tom', 'Jonas'],
    weather: 'Cold sun, 11°',
    mood: 'Nostalgic',
    art: 'autumn',
    story: `We met at the gate of Linden Park at 2pm because Mira refused to be late for once. Tom brought a thermos but forgot the cups, so we walked to the little kiosk by the pond and bought three oat flat whites. Around 3pm we found the green bench with the brass plaque — "For Agnes, who fed the ducks." Jonas read it out loud in a radio voice and we couldn't stop laughing. The leaves were coming down so fast that Mira started catching them and keeping the ones without holes. At 4:30 the light went orange and nobody wanted to say it was getting cold. I kept the receipt in my coat pocket. I want to remember that nothing happened today and it was perfect. Should we do this every October?`,
    song: { title: 'Paper Lanterns', artist: 'The Halverson Quartet (fictional)', tempo: 'slow' },
    details: ['Kiosk receipt — 3 × oat flat white, €11.40', 'Mira’s mustard scarf', 'The plaque: “For Agnes, who fed the ducks.”', 'A leaf with no holes, pressed in my notebook'],
    moments: [
      { id: 'a1', time: '14:00', text: 'We met at the gate of Linden Park at 2pm' },
      { id: 'a2', text: 'walked to the little kiosk by the pond and bought three oat flat whites' },
      { id: 'a3', time: '15:00', text: 'we found the green bench with the brass plaque' },
      { id: 'a4', text: 'Mira started catching them and keeping the ones without holes' },
      { id: 'a5', time: '16:30', text: 'the light went orange and nobody wanted to say it was getting cold' },
    ],
    recall: [
      { id: 'ar1', sentence: 'Tom brought a thermos but forgot the cups, so we walked to the little kiosk by the pond and bought three oat flat whites.', word: 'thermos' },
      { id: 'ar2', sentence: 'Jonas read it out loud in a radio voice and we couldn\'t stop laughing.', word: 'radio' },
    ],
    threads: [
      { id: 'at1', quote: 'I want to remember that nothing happened today and it was perfect.', kind: 'intention' },
      { id: 'at2', quote: 'Should we do this every October?', kind: 'question' },
    ],
    theme: 'autumn',
    cover: 'leaves',
    baths: ['surface', 'sequence', 'recall', 'meeting'],
    createdAt: created,
  }

  const ambition: Memory = {
    ...base,
    id: 'demo-ambition',
    title: 'The Ambition at Seventeen',
    date: '2019-03-03',
    time: '23:40',
    location: 'My bedroom desk',
    people: ['Mr. Hale', 'Mum'],
    weather: 'Rain on the window',
    mood: 'Determined, a bit angry',
    art: 'ambition',
    story: `I couldn't sleep so I'm writing this at my desk with the lamp on. Today in economics Mr. Hale asked what we want to be in ten years and I said "running my own company" and half the class laughed. I'm not angry. Okay, I'm a bit angry. I want to become a millionaire before 25. I know how that sounds. I'm going to learn to code properly this summer instead of just watching tutorials. I promise I'll build something real before I finish university. Mum thinks I should study medicine like my cousin. Maybe she's right? I don't know. Is it stupid to want something this much when you don't even know what it is yet?`,
    song: { title: 'Overdrive Dreams', artist: 'Kestrel Youth (fictional)', tempo: 'mid' },
    details: [],
    moments: [],
    recall: [
      { id: 'br1', sentence: 'Today in economics Mr. Hale asked what we want to be in ten years and I said "running my own company" and half the class laughed.', word: 'economics' },
      { id: 'br2', sentence: 'Mum thinks I should study medicine like my cousin.', word: 'medicine' },
    ],
    threads: [
      { id: 'bt1', quote: 'I want to become a millionaire before 25.', kind: 'intention' },
      { id: 'bt2', quote: "I'm going to learn to code properly this summer instead of just watching tutorials.", kind: 'intention' },
      { id: 'bt3', quote: "I promise I'll build something real before I finish university.", kind: 'intention' },
      { id: 'bt4', quote: "Is it stupid to want something this much when you don't even know what it is yet?", kind: 'question' },
    ],
    theme: 'paper',
    cover: 'dust',
    baths: ['recall', 'ledger', 'meeting'],
    createdAt: created,
  }

  const night: Memory = {
    ...base,
    id: 'demo-night',
    title: 'The Night Everything Was Due',
    date: '2025-11-20',
    time: '21:30',
    location: 'Studio flat, 4th floor',
    people: ['Lena', 'Mira'],
    weather: 'Dry, 3°, a clear sky by morning',
    mood: 'Wired',
    art: 'night',
    story: `21:30 — opened the laptop with nine hours until the deadline and a project that was mostly a README.
22:15 — Lena called to ask if I was alive. I said yes. That was optimistic.
23:40 — the database finally connected and I yelled at an empty room.
01:05 — ate cereal over the sink, put the same album on repeat for the third time.
02:50 — everything broke when I renamed one folder. I almost gave up. Put on the playlist Mira made us in October and kept going. I'm going to sleep for twelve hours after this.
03:47 — fixed it. It was a missing slash. A missing slash.
05:12 — submitted. The sky is going grey-blue and the birds have started. Will anyone ever know how close this was?`,
    song: { title: 'Low Battery', artist: 'NORTHLINE (fictional)', tempo: 'fast' },
    details: ['Sticky note on the monitor: SHIP IT', 'Three empty cans of cold brew', 'ENOENT: no such file or directory', 'Battery at 4% when it finally went through'],
    moments: [
      { id: 'c1', time: '21:30', text: 'opened the laptop with nine hours until the deadline and a project that was mostly a README.' },
      { id: 'c2', time: '22:15', text: 'Lena called to ask if I was alive.' },
      { id: 'c3', time: '23:40', text: 'the database finally connected and I yelled at an empty room.' },
      { id: 'c4', time: '01:05', text: 'ate cereal over the sink, put the same album on repeat for the third time.' },
      { id: 'c5', time: '02:50', text: 'everything broke when I renamed one folder.' },
      { id: 'c6', time: '03:47', text: 'fixed it.' },
      { id: 'c7', time: '05:12', text: 'submitted.' },
    ],
    recall: [
      { id: 'cr1', sentence: '03:47 — fixed it. It was a missing slash.', word: 'slash' },
      { id: 'cr2', sentence: '01:05 — ate cereal over the sink, put the same album on repeat for the third time.', word: 'cereal' },
    ],
    threads: [
      { id: 'ct1', quote: "I'm going to sleep for twelve hours after this.", kind: 'intention' },
      { id: 'ct2', quote: 'Will anyone ever know how close this was?', kind: 'question' },
    ],
    theme: 'night',
    cover: 'static',
    baths: ['surface', 'sequence', 'recall', 'meeting'],
    createdAt: created,
  }

  const letters: Letter[] = [
    {
      id: 'demo-l-autumn',
      demo: true,
      memoryId: autumn.id,
      to: 'future',
      writtenAt: '2025-10-12T23:04:00',
      body: `Dear whoever opens this,

It's 11pm and my hands still smell like cold air and coffee. Today was nothing. We sat on a bench and talked about nothing and I was happy the entire time.

I'm writing this because I know I'll forget it. I always forget the nothing days.

If we're still friends with Mira, Tom and Jonas — tell them. If we're not, I hope you at least remember the plaque.

— me, 23, slightly sunburnt in October somehow`,
    },
    {
      id: 'demo-l-2019',
      demo: true,
      memoryId: ambition.id,
      to: 'future',
      writtenAt: '2019-03-03T23:58:00',
      sealedUntil: '2022-03-03T09:00:00',
      openedAt: '2022-03-05T20:14:00',
      body: `Dear future me,

I don't know where you will be when you read this. Right now I'm seventeen and I'm trying to build something of my own, except I don't know what it is yet.

At 17, I want to become a millionaire. I have no idea whether that's realistic, but I'm determined.

Please tell me we didn't do medicine.

I really hope we made it.`,
    },
    {
      id: 'demo-l-2022',
      demo: true,
      memoryId: ambition.id,
      parentId: 'demo-l-2019',
      to: 'future',
      writtenAt: '2022-03-05T21:02:00',
      sealedUntil: new Date(now.getTime() - 18 * DAY).toISOString(),
      body: `Hey. I read your letter today — two days late, which feels about right.

We didn't do medicine. Mum was upset for a month and then she wasn't.

We're not millionaires. We have about €340 and a laptop with a broken hinge. But I built the thing: a tiny app for booking the school's music rooms. Forty-one people use it. I know that's not what you meant.

I'm sealing this one for a while. Whoever opens it next: are we still building?`,
    },
    {
      id: 'demo-l-night',
      demo: true,
      memoryId: night.id,
      to: 'future',
      writtenAt: '2025-11-21T05:31:00',
      sealedUntil: new Date(now.getTime() + 2 * DAY + 3 * 3600000).toISOString(),
      body: `To the me who survived this:

Was it worth it? Be honest. I'll know if you're lying.

Also: back up the folder. Name it properly. Nobody needs a folder called final_final_REAL.

Go to sleep.`,
    },
  ]

  return { memories: [autumn, ambition, night, ...moreDays(created)], letters }
}

/**
 * Three more demo days, added later so the feed has a full week and every technique shows up once.
 * Their photos are frames from the demo camera roll (see DEMO_PHOTOS in demo/upgrade.ts).
 */
export const MORE_DEMO_IDS = ['demo-picnic', 'demo-frost', 'demo-records'] as const

function moreDays(created: string): Memory[] {
  // the favourite day: the most detailed one, written as the day the person would keep
  const picnic: Memory = {
    ...base,
    id: 'demo-picnic',
    title: 'The Longest Picnic of September',
    date: '2025-09-07',
    time: '16:00',
    location: 'Kessel Park',
    people: ['Mira', 'Tom', 'Jonas', 'Lena', 'Ada', 'Sami', 'Noor'],
    weather: 'Warm, 24°, a breeze after five',
    mood: 'Happy, all day',
    art: 'picnic',
    story: `If I could keep one day from this year, it's this one. It started at the Saturday market, where Ada bought a whole paper bag of plums because the man said they were the last good ones. We carried everything up the hill: two blankets, a speaker, a watermelon nobody had a knife for. Tom solved the watermelon with a frisbee edge and Lena laughed so hard she cried. By three, two more friends from Ada's course had found us and it turned into a party. Mira performed the worst poems from a paperback she found in a free box, in a dramatic voice, and we voted on the worst one. Then Jonas turned the speaker up way too loud and we danced barefoot on the blankets until his sunglasses flew into the grass. At six we raced the bikes home the long way past the wheat field, all five of us in a line, shouting the chorus of the one song we all know. The sun was low and gold and the field looked like it was on fire. I never want to forget the sound of everyone laughing at the same time. Let's do this again before the summer is completely over.`,
    song: { title: 'Golden Hour Parade', artist: 'The Sunday Kites (fictional)', tempo: 'fast', bpm: 128, mode: 'major', genre: 'pop', year: 2024, energy: 0.92, bpmSource: 'typed' },
    details: ['A paper bag of plums from the last stall', 'The watermelon, opened with a frisbee', 'Mira’s worst poem of the day: “Ode to a Parking Ticket”', 'Jonas’s sunglasses, lost in the grass mid-dance', 'Five bikes in a line past the wheat field'],
    moments: [
      { id: 'p1', time: '10:30', text: 'Ada bought a whole paper bag of plums' },
      { id: 'p2', time: '13:00', text: 'We carried everything up the hill' },
      { id: 'p3', text: 'Tom solved the watermelon with a frisbee edge and Lena laughed so hard she cried' },
      { id: 'p4', time: '15:30', text: 'Mira performed the worst poems from a paperback she found in a free box' },
      { id: 'p5', text: 'we danced barefoot on the blankets until his sunglasses flew into the grass' },
      { id: 'p6', time: '18:00', text: 'we raced the bikes home the long way past the wheat field' },
    ],
    recall: [
      { id: 'pr1', sentence: 'It started at the Saturday market, where Ada bought a whole paper bag of plums because the man said they were the last good ones.', word: 'plums' },
      { id: 'pr2', sentence: 'Tom solved the watermelon with a frisbee edge and Lena laughed so hard she cried.', word: 'frisbee' },
      { id: 'pr3', sentence: 'Then Jonas turned the speaker up way too loud and we danced barefoot on the blankets until his sunglasses flew into the grass.', word: 'barefoot' },
    ],
    threads: [
      { id: 'pt1', quote: 'I never want to forget the sound of everyone laughing at the same time.', kind: 'intention' },
      { id: 'pt2', quote: "Let's do this again before the summer is completely over.", kind: 'intention' },
    ],
    theme: 'autumn',
    cover: 'leaves',
    baths: ['surface', 'sequence', 'recall', 'ledger', 'meeting'],
    createdAt: created,
  }

  const frost: Memory = {
    ...base,
    id: 'demo-frost',
    title: 'The First Frost, Alone',
    date: '2025-11-07',
    time: '08:30',
    location: 'The field road behind the station',
    people: [],
    weather: 'Fog, −1°, first frost',
    mood: 'Quiet',
    art: 'frost',
    story: `Woke up before the alarm. The car outside was covered in the first frost, thin white ferns all over the windshield. I didn't take the car. I walked the field road behind the station instead. The fog was so thick the power poles disappeared one by one into white. No one else was out. I could hear my own steps and nothing else. At home I put the dried hydrangeas from the summer in the jar on the shelf. Nothing to do, nowhere to be. It was enough.`,
    song: { title: 'Field in White', artist: 'Ilse Marin (fictional)', tempo: 'slow', bpm: 58, mode: 'minor', genre: 'ambient piano', energy: 0.12, bpmSource: 'typed' },
    details: ['Frost ferns on the windshield', 'Power poles fading into the fog', 'Dried hydrangeas in the glass jar'],
    moments: [
      { id: 'f1', time: '07:40', text: 'The car outside was covered in the first frost' },
      { id: 'f2', time: '08:30', text: 'I walked the field road behind the station instead' },
      { id: 'f3', time: '10:00', text: 'I put the dried hydrangeas from the summer in the jar on the shelf' },
    ],
    recall: [{ id: 'fr1', sentence: 'The fog was so thick the power poles disappeared one by one into white.', word: 'poles' }],
    threads: [],
    theme: 'paper',
    cover: 'dust',
    baths: ['surface', 'recall', 'meeting'],
    createdAt: created,
  }

  const records: Memory = {
    ...base,
    id: 'demo-records',
    title: 'Grandma’s Records, One Evening',
    date: '2025-09-28',
    time: '20:30',
    location: 'Grandma’s flat on Weaver Street',
    people: ['Grandma'],
    weather: 'Rain in the evening',
    mood: 'Nostalgic, tender',
    art: 'records',
    story: `Spent the evening at Grandma's helping her sort the old records. She remembers where she bought every single one. When I was little I used to fall asleep in this armchair while she played the same jazz album every Sunday, and tonight she put it on again without saying anything. The needle crackles in the same place it always did. She found a letter from Grandpa tucked in one of the sleeves, from 1974, and read it by the candle because the lamp is too bright for her eyes now. I didn't understand all of it but I understood her face. I want to remember the smell of the paper sleeves. I'm taking the armchair blanket home; she insisted.`,
    song: { title: 'Weaver Street Waltz', artist: 'Otto Brand Trio (fictional)', tempo: 'slow', bpm: 84, mode: 'major', genre: 'jazz', year: 1972, energy: 0.3, bpmSource: 'typed' },
    details: ['The crackle at the same spot of side B', 'Grandpa’s letter from 1974, in a record sleeve', 'The wool blanket from the armchair'],
    moments: [
      { id: 'r1', time: '18:00', text: "Spent the evening at Grandma's helping her sort the old records" },
      { id: 'r2', text: 'tonight she put it on again without saying anything' },
      { id: 'r3', time: '21:30', text: 'She found a letter from Grandpa tucked in one of the sleeves' },
    ],
    recall: [
      { id: 'rr1', sentence: 'The needle crackles in the same place it always did.', word: 'needle' },
      { id: 'rr2', sentence: "I'm taking the armchair blanket home; she insisted.", word: 'blanket' },
    ],
    threads: [{ id: 'rt1', quote: 'I want to remember the smell of the paper sleeves.', kind: 'intention' }],
    theme: 'paper',
    cover: 'dust',
    baths: ['surface', 'sequence', 'recall', 'meeting'],
    createdAt: created,
  }

  return [picnic, frost, records]
}
