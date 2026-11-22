# Afterimage

*A darkroom for the person you were.*

Each day you save becomes a **negative** on the drying line. To see it again, you **develop** it in the darkroom, and you develop it by remembering. Every detail you recover brings the photograph out of the dark: from inverted and grainy, through sepia, to full colour. At the end of the baths, the person who lived that day speaks to you through the letter they left, and you answer. Your answer is sealed until a date you choose, for whoever you'll be next.

The creative exploration and design rationale are in [DESIGN.md](DESIGN.md).

### The brief: *Make the Invisible Visible*

One day (text, photos, a song) becomes one **day card**: the same 4:5 frame every time, with a technique, palette, grain and rhythm worked out from the day itself, an explanation of every choice, a synthesised narration, and a 3–7 word folder name. The song visibly drives the card: its bpm sets how long each photo stays, its energy the contrast and pulse, its key the colour, its year the grain.

| Document (in Russian, for the jury) | |
|---|---|
| [docs/DESCRIPTION.md](docs/DESCRIPTION.md) | The project on one page |
| [docs/TECHNIQUES.md](docs/TECHNIQUES.md) | Mood → art technique table; constant vs. variable; how music and voice are chosen |
| [docs/TOOLS.md](docs/TOOLS.md) | Libraries, browser APIs, external services and AI used |
| [docs/DEMO.md](docs/DEMO.md) | How to run it, the demo days, the video script, where each requirement lives in the code |

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

### The Stranger (optional, your own Gemini key)

The game runs in the browser with **your own** Gemini API keys (BYOK) — the server keys above are not used, and there's no backend for it.

1. Settings → **The Stranger · AI configuration** (or **AI settings** on the game screen).
2. Paste one or more keys from <https://aistudio.google.com/apikey> (commas or new lines). Each request uses the next key in order — 1, 2, 3, 1… — and the position survives reloads. Free-tier limits are per Google Cloud project, so keys from one project share one quota.
3. Tick the consent box. It lists exactly what is sent: passages you wrote (tagged names masked as `[name]`), never photos, exact dates, sealed letters or keys.
4. **Build my writing profile** (a representative sample, one request) or **Use whole archive** (batches of ~14k characters, max 8, then a merge). The profile is cached on the device; **Refresh** folds in only new writing.
5. Press **Play Stranger**. Impostor lines are written ten per request, checked (no copies or near-copies of your writing, no archive names, dates, AI clichés, odd lengths or languages you never use) and queued in IndexedDB; the queue tops itself up in the background below four.

Keys live in `localStorage` only and never enter backups; the profile, queue, played rounds and request metadata live in IndexedDB (`meta` store, `stranger:*`). Model: `gemini-3.5-flash-lite` (fallback `gemini-3.6-flash`), set in `src/lib/gemini.ts`. Code: `src/lib/gemini.ts` (client, rotation, errors), `src/lib/stranger/` (fragments, game rules, style profile & validation, engine), `src/views/Stranger.tsx`, `src/components/StrangerAI.tsx`.

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
| Print `#/print/:id` | The developed day as an editorial page. It opens with the **day card** and **Why it looks like this** (technique, scores, every reason, constant vs. variable), **Listen** and **Read it aloud**; then photograph, contact strip, song, original story, timeline, details, ledger, correspondence, and "what I remember now" margin notes. At the foot, **Download the day folder** saves a ZIP: story, photos, song data (never the audio), the card as PNG, how it was made, and the narration |
| Side by side `#/feed` | The last 5–7 days as day cards in a row: one frame, a different weather inside each. Linked from Memories |
| Expose `#/new` | Five frames: story → photos & song → context → *what we noticed* (an editable review of everything the reader extracted) → a letter forward |
| Correspondence `#/letters` | Every letter grouped by day; write to a future you or to a past you; a letter can be edited for 24 hours after you write it |
| Enlarger `#/double/:a/:b` | **Double exposure.** Drag one day's frame over another's. Shared people, places, songs, seasons and words come through as they line up, each word shown in both original sentences. Caption it and keep it |
| The Stranger `#/stranger` | **Find the one who isn't you.** Six frames on a contact sheet: five passages you wrote, one Gemini wrote in your style. Hold a frame for 0.8 s to accuse it; three accusations. A real passage develops and shows its date, source and photo; the impostor stays a negative under the red safelight. Play round after round. Old `#/strip` links land here |
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

The six demo days belong to a **fictional** person, one for each technique: *The Autumn Afternoon* (impression), *The Ambition at Seventeen* (nocturne), *The Night Everything Was Due* (Kandinsky), *The Longest Picnic of September* (collage, the detailed "favourite day"), *The First Frost, Alone* (ma) and *Grandma’s Records, One Evening* (found film). Their songs and artists are invented. Their photographs are generated (`public/demo/`, see `scripts/gen_photos.py`); without those files the app falls back to original SVG illustrations (`src/demo/art.ts`, `src/demo/shoebox.ts`). Restore them under Settings → **Restore demo days**.
