# Afterimage

*A darkroom for the person you were.*

Each day you save becomes a **negative** on the drying line. To see it again, you **develop** it in the darkroom, and you develop it by remembering. Every detail you recover brings the photograph out of the dark: from inverted and grainy, through sepia, to full colour. At the end of the baths, the person who lived that day speaks to you through the letter they left, and you answer. Your answer is sealed until a date you choose, for whoever you'll be next.

The creative exploration and design rationale are in [DESIGN.md](DESIGN.md).

## Run it

```bash
npm install
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

Everything (memories, photographs, audio, letters, progress) lives in the browser's IndexedDB on your device.

### Pictures drawn from your words (optional)

While you write a new day, Afterimage can draw a picture of it. The only server code is `api/imagine.ts` (a Vercel function; `npm run dev` serves the same handler locally): Gemini turns the story into a scene description, Pollinations draws it, and the image goes straight back to the browser, which crops off the bottom strip and saves it with the memory on the device. The server stores nothing. The writer can turn it off under the story box.

1. Copy `.env.example` to `.env` and fill in `GEMINI_API_KEYS` (comma separated, rotated per request) and `POLLINATIONS_API_KEY` (`sk_…` from enter.pollinations.ai).
2. On Vercel, add the same variables in Project Settings → Environment Variables.

Never prefix these with `VITE_`: that would put them in the public bundle.

The starting demo photos come from `PHOTO_PROMPTS.json`: `python scripts/gen_photos.py` fills in any that are missing in `public/demo/`.

## What's inside

## How the app is organised

1. **Landing** `#/` — the promo page with the generated clips (first visit only; later visits go straight in). Entering plays a shutter transition.
2. **A guided tour** on first entry: a spotlight walks over the navigation, one sentence per section. Replay it from Settings.
3. **Five places, always one tap away** — a top bar on computers, a tab bar on phones: **Today · Journal · ＋ · Memories · Letters**.
   - **Today** shows one thing to do next (a letter that arrived, a day to develop), three small rituals, and your latest photos.
   - **＋** opens a sheet: save a day, bring in photos, or write to future you.
4. Explanations live behind a small **ⓘ** (hover or tap), so pages stay clean.

| Where | What |
|---|---|
| Front page | Masthead, letters that have **arrived**, the **drying line** (negatives by year), **unfinished threads** you can stamp on the spot, letters **in the post**, contents |
| Darkroom `#/develop/:id` | Up to five baths, depending on what the day contains:<br>**Surface:** brush away leaves, dust or static to uncover the small things you kept (finger, mouse or Space)<br>**Sequence:** put the moments back in order; strips in the right place lock<br>**Recall:** guess a missing word in your own sentence, with letter-by-letter feedback<br>**Ledger:** stamp past promises *Kept · Changed · Let go · Still trying*<br>**Meeting:** read the letter paragraph by paragraph, then answer and seal it |
| Print `#/print/:id` | The developed day as an editorial page: photograph, contact strip, song, original story, timeline, details, ledger, correspondence, and "what I remember now" margin notes |
| Expose `#/new` | Five frames: story → photos & song → context → *what we noticed* (an editable review of everything the reader extracted) → a letter forward |
| Correspondence `#/letters` | Every letter grouped by day; write to a future you or to a past you; a letter can be edited for 24 hours after you write it |
| Enlarger `#/double/:a/:b` | **Double exposure.** Drag one day's frame over another's. Shared people, places, songs, seasons and words come through as they line up, each word shown in both original sentences. Caption it and keep it |
| Test strip `#/strip` | **Daily.** One of your sentences comes back without its date. Expose months on a strip of your life (five tries; clues come from your own records) |
| Connect `#/connect` | **Bring photos in, on this device.** Pick photos or a whole folder from your gallery: the date and GPS come from inside each photo (EXIF). Or open **your own Instagram data export** (ZIP or unzipped folder): posts and archived stories, with dates and captions. Nothing is uploaded |
| Journal `#/journal/:yyyy-mm` | A month board: a photo on every day you kept one, your captions in handwriting, a polaroid of the fullest day, a sticky note. Undeveloped memories show as negatives |
| Page `#/page/:date` | A traveler's-notebook spread for one day, laid out automatically with instax frames, tickets, a song tag, stamped letters and washi tape. Drag, rotate and resize; add notes, tape and stickers. Saved as you go. **Turn this day into a memory** sends it to the darkroom with its photos and captions |
| Music box `#/music/:yyyy-mm` | **A month, played by your photographs.** Each photo is punched into a paper music-box strip: its main colours choose the notes (warm low, cool high, light colours an octave up); a day kept as a memory rings the lowest tooth. Turn the crank, drag the paper, or press Space. Tap to punch your own holes |
| Arrival `#/arrival/:id` | Opening a letter that has arrived, including the chain of letters before it |

## Principles

- **Your words are never rewritten.** The offline reader in `src/lib/extract.ts` only *selects* verbatim spans from your story. Text written by the app is always marked **◇**.
- **Music is chemistry.** The song's tempo sets how the tray rocks and drives a live WebAudio soundscape (`src/lib/sound.ts`); its title tints the print. If you upload your own recording, it plays instead.
- **Prints fade.** A developed print you haven't looked at for a month slowly fades; hold to fix it again.
- **Sealed means sealed.** A letter can't be opened before its date.

## Video

The landing page and the Today card use eight short clips in `public/media/` (generated with Veo 3.1 from the prompts in [VEO_PROMPTS.md](VEO_PROMPTS.md), compressed to ~3 MB in total). Videos only play while on screen, and not at all with reduced motion.

## Demo content

The three demo days (*The Autumn Afternoon*, *The Ambition*, *The Night Everything Was Due*) belong to a **fictional** person. Their pictures are original SVG illustrations drawn for this project (`src/demo/art.ts`). Their songs and artists are invented. The demo "camera roll" in the journal (October–November 2025) is also made of original SVG scenes (`src/demo/shoebox.ts`). You can restore them from the colophon at the bottom of the front page.
