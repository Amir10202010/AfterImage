# Afterimage — a darkroom for the person you were

> Your past is not something to look at. It's someone you can meet again.

This document records the creative exploration behind Afterimage, the decision
that came out of it, and the rules the product follows.

---

## 1. Exploration — eight directions

Each direction was judged on what the user actually *does*, not on which pages exist.
Scores are 1–5 for **O**riginality, **I**nteraction depth, **E**motional impact,
**V**isual potential, **F**easibility, **R**epeat engagement, **D**emo appeal.

| # | Direction | Central interaction | O | I | E | V | F | R | D | Σ |
|---|-----------|--------------------|---|---|---|---|---|---|---|---|
| 1 | **Memory Mosaic** | Drag scattered fragments (photo shard, song, timestamp) into a board until the day "clicks". | 3 | 4 | 3 | 4 | 4 | 2 | 4 | 24 |
| 2 | **Daily Recall** (Phrazle-like) | One clue a day: guess the year / the place / the missing word from your own archive. | 3 | 3 | 3 | 2 | 5 | 5 | 3 | 24 |
| 3 | **Letters across time** | Seal a letter until a date; when it arrives, read it and reply; replies seal again. | 3 | 2 | 5 | 3 | 5 | 5 | 4 | 27 |
| 4 | **The Darkroom** | A saved day is an undeveloped negative. You *develop* it by remembering: each recovered detail brings the image out of the dark. | 5 | 4 | 4 | 5 | 4 | 3 | 5 | 30 |
| 5 | **Excavation strata** | A memory is buried under layers (leaves, dust, static) you brush away to uncover objects. | 4 | 4 | 3 | 5 | 4 | 2 | 5 | 27 |
| 6 | **The Ledger of Promises** | Every "I will…" you ever wrote is collected; you stamp each one: kept, changed, let go, still trying. | 4 | 3 | 5 | 3 | 5 | 4 | 4 | 28 |
| 7 | **Radio of the years** | A dial tuned to dates; static resolves into a song and a voice note from that month. | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 25 |
| 8 | **Constellation** | Memories as stars connected by shared songs, people, places; you draw the lines. | 3 | 3 | 2 | 4 | 3 | 2 | 3 | 20 |

Notes from the evaluation:

* **Mosaic** and **Recall** were satisfying loops but, alone, felt like games *about* memories
  rather than *remembering*. A jigsaw has one right answer you don't care about; your own
  words do.
* **Letters** had the strongest emotion and the best reason to return, but on its own it is
  a passive inbox.
* **Darkroom** gave everything else a body: a single, recognisable metaphor in which
  remembering literally *makes the picture appear*. It also explains a new user's first
  interaction without a manual — a dark negative is obviously "not yet".
* **Excavation**, **Sequence** (the chronological piece of Mosaic), **Recall** and the
  **Ledger** turned out to be excellent *steps inside* the darkroom rather than products
  of their own.
* **Radio** contributed the idea that music should be *heard*, not attached. **Constellation**
  was dropped: pretty, but it is browsing.

## 2. The decision — Afterimage

Afterimage combines directions 4 + 5 + 1 + 2 + 6 + 3 into one ritual.

**Every day you save becomes a negative.** It hangs on *the drying line* — the archive —
dark and inverted. To see it again you take it into the darkroom and develop it. Developing
is not a loading bar; it is a sequence of *baths*, each one a small act of remembering, and
each one brings the image a little further out of the dark:

| Bath | Mechanic | What you do | Built from |
|------|----------|-------------|-----------|
| **I. Surface** | excavation | Brush away leaves / dust / static (mouse, finger or keyboard) to uncover small details you recorded. | the details you listed |
| **II. Sequence** | chronology | Put the moments of the day back in order. Feedback is quiet: a moment in the right place *fixes* and stays. | moments extracted from your story |
| **III. Recall** | phrase recovery | Your own sentence comes back with one word missing. Guess it; letters answer like a contact sheet: right, present, absent. | sentences from your story |
| **IV. Ledger** | promise review | Every intention or question you wrote is quoted back. Stamp it: *Kept · Changed · Let go · Still trying*, add a line if you like. | "I will…", "I want…", questions |
| **V. Meeting** | letters across time | The past you speaks — their letter, verbatim, line by line. You answer. Your answer is sealed for a future you. | your letter |

A memory only runs the baths its material supports, so three memories feel three
different ways. When the last bath ends, the print is finished: a developed photograph
with the song, the context, the original story, the conversation, and a margin note
"what I remember now" — written by present-you.

### Past · Present · Future

* **Past me** wrote the story and the letter. Their words are never edited, paraphrased or
  invented. They are typeset in the serif, with the date they were written.
* **Present me** develops, stamps the ledger, writes margin notes and replies. Their words are
  set in a hand-like italic with today's date.
* **Future me** receives sealed letters. A sealed letter cannot be opened early. When it
  arrives, the home page says so — and opening it is a scene, not a notification.
* **Afterimage itself** (deterministic prompts, framing lines such as "Hey. It's me.") is
  always marked with a ◇ and set in small sans, so nobody confuses the app's voice with yours.

Over time each memory accumulates a **thread**: letter → reply (sealed) → reply to the reply…
a conversation between versions of one person.

## 2b. Round two — connections, a daily ritual, and fading

The first version made a single day interactive. The second makes the **archive itself**
interactive, and gives a reason to come back that isn't a streak.

**Double exposure (the enlarger).** Two negatives are laid on top of each other. You drag
one frame over the other, and as they come into register, what the two days share
surfaces one thread at a time: a person in both, a place, the same song or tempo, a month
years apart, and above all **the same word used on both days**, shown as the two
original sentences side by side with the word underlined. At full register the frames
flash and lock, and you can caption the print in your own words. Saved double exposures
hang on the front page. If nothing connects two days, the app says so honestly; it never
invents a link. (Built in `src/lib/connect.ts`, with a light stemmer so "laughed" meets
"laughing".)

**The test strip (daily).** Once a day, one sentence you wrote comes back without its
date. You slide along a strip of your own life and *expose* a month. Each exposure burns a
band onto the strip, dark when close and pale when far, with *earlier / later*. Misses
unlock clues taken from what you recorded: the weekday and season, the weather and
mood, the song, then the sentence that came next. Five exposures. The result can be
copied as glyphs that contain none of your words. Days from the last month are left out,
because they are too fresh to be a game.

**The fade.** A developed print that nobody looks at for a month starts to fade: it loses
contrast, yellows, and the drying line marks it *Fading*. You restore it by **holding** a
button. That makes looking again a small, physical act rather than a notification.
Afterimages fade; that is the point of the name.

## 2c. Round three — the shoebox and the journal

People don't save days. Their phones do. So Afterimage now reads the **whole camera roll**
and turns it into a journal, and it does this without spending a single server cycle:

* **Camera roll.** Photos are picked with the system picker (a phone opens its library; a
  computer can open a folder). Each file's EXIF is parsed in the browser (`src/lib/exif.ts`)
  for the moment it was taken and its GPS position. Then each photo is decoded and resized on the device into a
  print and a thumbnail, and stored in IndexedDB.
* **Instagram, the honest way.** Not a scraper. Collecting photos and stories by a name or a
  handle would gather other people's pictures without consent, and it breaks Instagram's rules.
  Instead, the user opens **their own data export**. It's more complete anyway: it includes
  archived stories nobody else can see. A small ZIP reader built on the browser's
  `DecompressionStream` (`src/lib/zip.ts`) inflates only the files it needs, so even a
  multi-gigabyte export never loads into memory at once. Captions are repaired from
  Instagram's Latin-1 escaping.
* **The month board** echoes a printed scrapbook calendar: one photo per day, handwriting from
  your own captions, a polaroid of the fullest day, a sticky note, a pressed flower.
* **The notebook spread** echoes a traveler's notebook: instax frames, a ticket stub, a song tag
  on twine, typed date, stamped letters from the place, washi tape. All of it is laid out
  automatically, then entirely yours to drag, rotate and decorate.
* **The bridge back to remembering.** Journal photos are not memories yet: they're what the camera
  kept. *Turn this day into a memory* carries the day's photos and captions into the darkroom.
  Days that already have an undeveloped memory appear as **negatives** in the journal.

## 2d. Round four — the music box

An archive of photos has never been played like an instrument. Afterimage now punches a month into
a **paper-strip music box**: each photo's colours, read on the device (`src/lib/colors.ts`),
choose which of 15 brass teeth it strikes. Warm colours sit low, cool colours sit high, light
colours climb an octave, and a day you kept as a memory rings the lowest tooth. The same month
always writes the same tune, so a month has a sound you can recognise. You turn the crank with
your finger (notes only sound when the paper moves forward, as in a real box), drag the paper to
scrub, or punch holes of your own to rewrite it.

## 3. Music is chemistry

The song you attach is not a link in a footer. It sets the *developer*:

* a **tempo feel** (slow / mid / fast) drives how the tray rocks, how fast the image breathes,
  and the generative soundscape that plays while you develop (WebAudio, synthesised live —
  no samples, no licensing).
* the **song title + artist** seed the palette shift and the chord root, so the same song
  always tints a print the same way.
* an uploaded **audio file** (your own) plays in the darkroom instead of the soundscape.
* a streaming **link** opens the real song.

## 4. AI that helps, never replaces

Afterimage ships with a deterministic, offline "reader" (`src/lib/extract.ts`). It:

* splits the story into sentences, finds time expressions ("at 4pm", "around midnight",
  "23:40") and turns them into *moments*;
* picks rare, meaningful words (names, places, long nouns) for *Recall*;
* collects intentions ("I'm going to…", "I want to…", "I promise…") and questions for the *Ledger*;
* suggests a title.

Everything it suggests is shown in a review step and is editable or removable before saving.
It only ever selects **verbatim** spans of what you wrote — it never composes a sentence and
attributes it to you. Reflective prompts in the Meeting come from a fixed, labelled library.
No API key is required for any feature.

## 5. Art direction

* **Two rooms.** The *paper* room (archive, writing, letters) is warm ivory with charcoal ink,
  hairline rules, a magazine masthead. The *darkroom* is warm black under a burgundy safelight.
  Moving between them is the product's main transition.
* **Type.** Cormorant Garamond for mastheads, dates, quotations of past-you. Inter for interface.
  A mono for timestamps. Present-you's notes in Cormorant italic.
* **Colour.** Ivory `#F3EDE2`, paper `#FBF8F2`, charcoal `#26221E`, burgundy `#7A2E2E`,
  terracotta `#B4664A`, olive `#6E6E45`. Each memory adds its own accent from its song and mood.
* **Image treatment.** Negatives are inverted, grained and blurred; development crossfades into
  the positive with a sepia → full-colour ramp. Grain is an SVG turbulence filter.
* **Motion.** Slow. Things settle rather than bounce. The darkroom tray rocks at the song's tempo.
* **Avoid.** Gradients-as-decoration, neon, glass, rounded card grids, gamified counters.

## 6. The three demo memories (fictional)

All three are clearly labelled as fictional demonstration content. Their "photographs" are
original SVG compositions drawn for this project; their songs are fictional.

* **A — The Autumn Afternoon.** Park, friends, coffee, leaves. Baths: Surface (brush away
  leaves to find the receipt, the scarf, the bench plaque) → Sequence → Recall → Meeting.
  Warm amber safelight, a slow piano-like soundscape.
* **B — The Ambition (2019, age 17).** Notebook at a desk. Baths: Recall → Ledger (stamp each
  ambition: still a millionaire plan?) → Meeting with an existing thread: the 2019 letter,
  a 2022 reply, and now your turn. Daylight paper and ink.
* **C — The Night Everything Was Due.** 21:30 → 05:12, a deadline, electronic music.
  Baths: Surface (wipe static off the screen) → Sequence of timestamped commits at 124 bpm →
  Recall → Meeting. Phosphor on black, a pulsing kick.

## 7. Engineering

* Vite + React + TypeScript, no UI framework. Hash routing.
* **Local-first persistence** in IndexedDB (memories, photo & audio blobs, letters, progress).
  Nothing leaves the device.
* Demos are seeded on first launch and can be restored from the colophon.
* Touch, mouse and keyboard paths for every mechanic.
