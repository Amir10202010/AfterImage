# Veo 3.1 prompts for Afterimage

These are background clips for the landing page and transitions. They're written to match
Afterimage's art direction: warm ivory and charcoal, a burgundy safelight, 35 mm grain, and
slow motion that loops.

## How to use the result

1. Generate the **Hero** prompt in 16:9 (and, if you like, again in 9:16 for phones).
2. Save the clips as `public/media/hero.mp4` and `public/media/hero-portrait.mp4`.
   The front page picks them up automatically. They play muted, fade in, and sit under a
   cream veil so the masthead stays readable. With reduce-motion turned on, they don't play.
3. Keep each file small. Afterimage is local-first, so it shouldn't download megabytes it doesn't need:

```bash
ffmpeg -i veo_hero.mp4 -vf "scale=1920:-2,fps=24" -c:v libx264 -crf 26 -preset slow -an -movflags +faststart public/media/hero.mp4
```

```bash
ffmpeg -i veo_hero_vertical.mp4 -vf "scale=1080:-2,fps=24" -c:v libx264 -crf 27 -preset slow -an -movflags +faststart public/media/hero-portrait.mp4
```

**Tips for Veo**
- Write the prompt in English, put one idea in each clip, and describe the camera movement explicitly.
- Ask for a *seamless loop*. If the end still jumps, generate 2–3 variants and pick the calmest, or
  crossfade the last 0.5 s into the first in an editor.
- Generate each prompt 4–6 times. Small wording changes ("barely", "imperceptibly") make the motion slower.
- The negative constraints (no text, no logos, no faces, no neon) matter. Keep them.

---

## 1 · HERO: "The print comes back" (landing background, the wow shot)

```
Cinematic macro shot, 8 seconds, seamless loop, 16:9, shot on 35mm film (Kodak Portra 400 look),
fine organic grain, shallow depth of field, 50mm macro lens at f/2.8.

SCENE: A traditional photographic darkroom at night. Seen from directly overhead, a shallow
enamel developing tray filled with clear developer liquid sits on a dark walnut workbench. A sheet
of glossy photographic paper lies submerged in the tray.

ACTION (timeline):
0–2s: The paper is almost blank, a faint warm grey. Tiny ripples move slowly across the liquid
surface as the tray rocks imperceptibly, like a gentle breath.
2–6s: An image slowly emerges on the paper, the way a real print develops: first the darkest
shadows, then midtones. It is a softly blurred autumn park: silhouettes of three friends on a
wooden bench, golden trees, falling leaves, late-afternoon low sun. The faces are never
distinguishable, only silhouettes and shapes. The emergence is gradual and dreamlike, never sudden.
6–8s: The image reaches about 70% contrast and holds; the ripples settle, a single drop falls
from above and sends one concentric ring across the surface, then the liquid stills. The final
frame matches the first frame's composition and motion for a clean loop.

LIGHTING: A single deep burgundy-red darkroom safelight (#7A2E2E) from the upper left creates
a soft red glow on the liquid and warm crimson highlights on the tray's rim; everything else
falls into rich warm black (#17110D). Subtle caustic light patterns from the moving liquid
dance on the bench.

COLOR PALETTE: warm black, burgundy, terracotta (#B4664A), aged ivory (#F3EDE2), faded amber.
Low saturation, analog, timeless. Like a frame from an independent art film.

CAMERA: Locked overhead, with an extremely slow push-in (about 3% over 8 seconds), no shake.
MOOD: intimate, quiet, nostalgic, a memory coming back.
AUDIO: Very quiet darkroom room tone: soft liquid lapping, a distant clock tick. No music, no voices.

AVOID: any text, letters, numbers, logos, watermarks, UI, recognizable faces, hands entering the
frame, neon, purple, blue tint, glossy CGI look, fast motion, camera shake, lens flares, people moving.
```

**9:16 phone variant:** use the same prompt, but replace the first line with `…seamless loop, 9:16 vertical…`
and add: `Compose the tray vertically with the developing image filling the center third, leaving calm
dark space at the top and bottom.`

---

## 2 · "The drying line" (behind the archive section)

```
8-second seamless loop, 16:9, 35mm film grain, Kodak Vision3 500T look, 85mm lens, f/2.

A thin cotton string stretched horizontally across a dim room, slightly out of focus at the edges.
From it hang five strips of developed film negatives and two small photographic prints, held by
plain wooden clothespins. They sway almost imperceptibly, as if from a slow draft, each at a
slightly different rhythm. The negatives are amber-orange and translucent; when backlit, you
can see tiny tonal shapes inside the frames, never readable details.

Behind them, a softly blurred window lets in warm late-afternoon light through linen curtains;
dust particles float slowly through the light beams. Light leaks in warm orange drift across the
right edge for one second, then fade.

Camera: very slow lateral dolly from left to right (about 5% of frame width), parallax between
the string and the background. Palette: aged ivory, warm amber, charcoal, terracotta. Quiet,
nostalgic, tactile.
Audio: soft room tone, a faint rustle of film. No music.
Avoid: text, logos, faces, hands, modern objects, neon, purple, fast motion, harsh shadows.
```

---

## 3 · "Double exposure" (behind the Enlarger: connections between days)

```
8-second seamless loop, 16:9, overhead macro on a vintage light table, 35mm grain, 60mm macro.

Two semi-transparent photographic transparencies lie on a glowing cream-white light table. One
shows a blurred golden autumn park, the other a blurred city window at night with warm lit squares.
Over 5 seconds the top transparency slides slowly diagonally until it aligns perfectly over the
bottom one. As they align, the overlapping area brightens and blends into a single luminous
double exposure where the trees seem to grow through the city lights. At the moment of perfect
alignment, a soft warm glow pulses once across the table. Then the layers drift a few millimeters
apart again to loop.

Lighting: the soft backlight of the light table only, warm cream (#FBF8F2), with edges falling
off into warm charcoal vignette. Palette: ivory, amber, dusty terracotta, deep navy-black.
Motion: slow, precise, satisfying, like a puzzle piece settling.
Audio: a single soft paper slide sound, then silence. No music.
Avoid: text, faces, hands, UI, neon, purple, fast cuts, lens flares, CGI gloss.
```

---

## 4 · "The notebook": pages turning (behind the Journal / scrapbook)

The first version of this prompt kept the notebook still. A background clip has to loop, and a
single page turn ends on a different spread from the one it started on, so the loop jumps. There are
two ways to get the turn and keep the loop:

- **4A, the breeze.** Pages keep turning one after another, so the end looks like the start.
  Best behind the Journal or as a section background.
- **4B, one deliberate turn.** It plays once and stops on the new spread. Best as the **transition when
  you open a day** in the Journal (like the shutter on entry), not as a looping background.

### 4A · Pages turning in a breeze (loops)

```
8-second seamless loop, 16:9, top-down shot from directly above, 35mm film look (Fuji Superia 400),
35mm lens at f/4, fine organic grain.

SUBJECT: An open, thick traveler's notebook with a tan leather cover lies on a light oak desk. Every
page is a handmade collage: instant-film photos with white borders (soft blurred scenes: a river at
dusk, a café table, golden autumn trees, a city window at night), yellow ticket stubs, kraft paper tags
on twine, strips of washi tape (sage grid, faded red stripes, dusty pink with tiny flowers), pressed
white cosmos flowers, vintage postage stamps, and handwritten-looking scribbles that are NOT readable.
Every spread looks different, but they all share the same palette and style.

ACTION (timeline):
0–1s: The notebook rests open; morning sunlight from a window outside the frame lies across the pages
in soft parallel stripes from window blinds.
1–7s: A gentle breeze lifts the right-hand page. It curls slowly and turns over to the left, revealing
the next collage spread; a second page lifts and turns, then a third. Each page turn takes about two
seconds, with a soft, natural paper curl and real paper weight (no flipbook speed, no stiffness). The
attached photos and tickets bend slightly with the paper; a ticket stub flutters at its edge.
7–8s: The last page settles flat. The motion continues at the same rhythm, so the clip loops into its
own beginning without a visible cut.

LIGHTING: warm low morning sun, soft shadows cast by each turning page moving across the spread, dust
motes glittering in the light beams.
PALETTE: cream (#FBF8F1), kraft brown (#B48B5C), mustard yellow (#ECC94B), sage green (#8FA79B), muted
red (#C9574A), honey oak.
CAMERA: locked top-down, absolutely no camera movement; only the pages move.
MOOD: cozy, handmade, a life flicking past.
AUDIO: soft paper turning and rustling, a faint bird outside. No music, no voices.
AVOID: readable text, brand names, logos, faces, hands, people, phones, neon, purple, glossy CGI look,
pages turning too fast, pages tearing, flicker.
```

### 4B · One page turn into a new day (the transition when a day opens)

```
6-second shot, 16:9, slightly angled top-down view (about 70 degrees), 35mm film look (Kodak Portra 400),
50mm lens at f/2.8, shallow depth of field, soft grain.

SUBJECT: An open traveler's notebook with a tan leather cover on a light oak desk. The left page holds
a collage of instant photos, a yellow ticket stub, washi tape and a pressed cosmos flower; the right
page is held in place by a black elastic band.

ACTION (timeline):
0–1.5s: Stillness. Warm light; dust in the air; the elastic band is slipped off the edge of the right page
by itself (no hands visible), and the band falls gently to the side.
1.5–4.5s: The right page lifts from its corner, curls in a slow, graceful arc toward the camera, and
turns over to the left. The camera follows it with a tiny, smooth tilt. The page's shadow sweeps across
the spread. Midway, the light catches the back of the page and it glows warm and translucent for a moment.
4.5–6s: The page settles. The new spread is revealed: a fresh day's collage, with a large instant photo of a
golden park, a kraft tag on twine, a strip of sage washi tape and blank cream space on the right page,
as if waiting to be filled. Hold on this composition, completely still, for the final second.

LIGHTING: one warm window light from the upper left, honey-colored, soft shadows.
PALETTE: cream, kraft, mustard, sage, muted red, honey oak, a touch of burgundy.
MOOD: opening a memory, gentle anticipation.
AUDIO: one soft, satisfying page turn and the quiet slap of paper settling. No music.
AVOID: hands, people, faces, readable text, logos, flipping more than one page, fast motion, camera shake,
CGI paper, neon, purple.
```

**On the site:** save 4A as `public/media/notebook.mp4` (it replaces the current clip on the landing page and
the Journal chapter). 4B fits the moment you tap a day in the Journal, the way the shutter plays when you
enter the app. Generate it and I'll wire it in as `public/media/page-turn.mp4`.

---

## 5 · "A letter has arrived" (behind the arrival screen)

```
8-second seamless loop, 16:9, macro, 35mm grain, 100mm macro lens, f/2.2, very shallow depth of field.

A cream paper envelope lies on rumpled natural linen. Its flap is sealed with a deep burgundy
wax seal pressed with a simple abstract mark (no letters). A single candle just outside the frame
makes the light flicker gently across the wax, which catches tiny glints. Focus breathes very
slowly from the seal to the paper texture and back. Two tiny dust particles drift through the light.

Palette: ivory envelope, burgundy wax (#7A2E2E), warm candle amber, charcoal shadows.
Mood: anticipation, tenderness, something waiting for you for years.
Audio: soft candle flicker, quiet room. No music.
Avoid: text, handwriting that can be read, logos, hands, faces, neon, purple, fast motion.
```

---

## 6 · Short transitions (2–3 s, used between rooms)

Generate these as 8-second clips and cut the best 2 seconds.

**Ink bloom (paper room → darkroom):**
```
Macro, 16:9, 35mm grain. A drop of warm sepia-black ink falls into still water in a white
porcelain bowl and blooms outward in slow, silky, organic clouds that fill the frame and turn it
almost entirely warm black. Soft overhead light. Ultra slow motion. No text, no color other
than sepia, black and cream.
```

**Light leak (darkroom → paper room):**
```
16:9, abstract. Real analog film light leak: warm orange, amber and soft red light bleeds in from
the right edge, sweeps across the frame and burns out to a soft creamy white (#F3EDE2). Visible
film grain and gentle gate weave. No objects, no text, no shapes. Smooth, organic, 3-second sweep.
```

**Shutter (opening a memory):**
```
Extreme macro of a vintage camera's leaf shutter blades in warm dim light. The blades open slowly
from fully closed to fully open, revealing a soft cream glow, then hold. Metallic blades with a
warm brass sheen, 35mm grain, shallow depth of field. No text, no logos.
```

---

## 7 · The ink line that draws as you scroll (behind the main part of the landing)

**How it works on the site:** Veo makes a clip of one ink line being drawn from the top of the frame to
the bottom. The site doesn't play it as a normal video. It ties the clip's time to the scroll position,
so scrolling down draws the line further, and scrolling up runs it backwards. The clip sits behind the
blocks with `mix-blend-mode: darken`, so its ivory background disappears into the page and only the ink
stays visible.

For this to look seamless, the prompt asks for **exactly the page's colour (#F3EDE2), completely flat**:
no vignette, no shadows, no paper creases, and the camera must not move. Make the clip **vertical, 9:16**,
because the page is tall.

### 7A · Brush and ink (main option)

```
8-second shot, vertical 9:16, perfectly locked top-down camera looking straight down at a flat sheet of
smooth ivory paper that fills the entire frame edge to edge. The paper is a single flat, even colour,
exactly #F3EDE2, evenly lit with soft shadowless light, with no texture variation, no vignette, no creases,
no visible edges and no objects.

ACTION: An invisible brush paints ONE continuous line of deep burgundy ink (#7A2E2E) onto the paper,
starting at the top centre of the frame and travelling all the way down to the bottom edge over exactly
8 seconds at a steady, calm speed. The brush itself, the hand and any tool are never visible; only the ink
appears, as if drawing itself. The line meanders elegantly: it swings to the right third, makes one small
hand-drawn loop, sweeps across to the left third, makes another small loop, swings back to the right,
and exits at the bottom centre. Real brush character: the stroke is about 1% of the frame width, slightly
thicker where the brush slows on the loops, with dry-brush bristle streaks at its edges, tiny ink pooling at
the tips of the loops, and a wet glossy sheen on the freshest part of the line that dries to matte behind it.
The line only grows forward; nothing already drawn ever moves or fades.

STYLE: macro, photographic, true-to-life ink on paper, crisp focus across the whole frame.
AUDIO: silence.
AVOID: hands, brushes, pens, any visible tool, camera movement, zoom, parallax, shadows, vignette, paper
texture changes, colour shifts in the background, splatter outside the line, multiple lines, text, letters,
logos, symbols.
```

### 7B · Fountain pen (finer, calmer)

```
8-second shot, vertical 9:16, locked top-down camera over a flat sheet of ivory paper that fills the whole
frame, flat even colour exactly #F3EDE2, shadowless soft light, no vignette, no texture, no objects.

ACTION: One continuous line of dark burgundy fountain-pen ink (#5A1F1F) draws itself from the top centre to the
bottom of the frame over exactly 8 seconds, at an even pace. It is fine and elegant, about 0.4% of the
frame width, with subtle width changes like a flexible nib: thinner on fast curves, slightly fuller on slow
turns. It traces a graceful meandering path with two small cursive loops and gentle S-curves, never crossing
itself more than inside those loops. The ink looks wet and slightly glossy at the growing tip and settles
matte behind it. No pen or hand is ever visible.

AUDIO: silence.
AVOID: visible pen, hands, camera movement, shadows, vignette, background colour change, blots, splatter,
text, letters, numbers, logos.
```

### 7C · Living ink (the "goo" option, more fluid and organic)

```
8-second shot, vertical 9:16, locked top-down camera over a perfectly flat ivory surface that fills the frame,
flat even colour exactly #F3EDE2, soft shadowless light, no vignette, no texture, no objects.

ACTION: A slow, glossy stream of liquid burgundy ink (#7A2E2E) flows by itself across the surface like a living
river, starting at the top centre and creeping down to the bottom edge over exactly 8 seconds. Its leading
tip is a rounded, shiny bead that pulls the stream along; the stream is about 1.5% of the frame width and
meanders in soft S-curves, briefly pooling into two small round puddles along the way (one on the right third,
one on the left third) before continuing. Thin capillary tendrils feather out slightly at the edges and the
surface catches soft highlights. The ink that has already flowed stays exactly where it is and slowly
turns from glossy to satin.

STYLE: macro, photographic, physically believable liquid, crisp focus.
AUDIO: silence.
AVOID: hands, tools, droppers, camera movement, zoom, shadows on the background, vignette, background colour
change, splashes, drops falling from above, multiple streams, text, logos.
```

**Tips**
- Generate 4–6 takes and keep the one whose background is the flattest and whose line moves at the most even
  speed. Even speed matters here, because scrolling maps directly onto time.
- If Veo adds a vignette or warm corners, add *"the four corners of the frame are exactly the same colour as
  the centre"*.
- For smooth scrubbing, the clip must be re-encoded with a keyframe on every frame (otherwise it stutters when
  you scroll backwards):

```bash
ffmpeg -i veo_ink.mp4 -vf "fps=30,scale=-2:1920" -c:v libx264 -crf 20 -g 1 -pix_fmt yuv420p -an -movflags +faststart public/media/ink-line.mp4
```

Save it as `public/media/ink-line.mp4`.

---

## 8 · Transition: ink → light leak (between the last two landing sections)

**Frames to video.** Put `frames/ink-LAST-frame.png` as the **first frame** and `frames/leak-FIRST-frame.png`
as the **last frame**. Aspect 16:9, 8 seconds (4 is enough if you want it snappier).

The two frames already rhyme: the ink clip ends with the bowl almost entirely filled with dark ink, and the
light leak begins as a dark-brown film frame with faint orange glints. The transition goes **through the
darkness**: the ink fills the whole frame, and the darkness becomes the film itself.

```
Seamless cinematic transition, 16:9, 8 seconds, macro, 35mm film look with fine organic grain.

START (first frame): a white porcelain bowl of water seen from above, almost entirely filled with blooming
clouds of dark sepia-black ink, silky tendrils curling at the edges.

ACTION (timeline):
0–2.5s: The ink keeps blooming in slow motion, swelling toward the camera until its soft, velvety clouds
fill the entire frame; the white rim of the bowl disappears; the image becomes an almost-black, warm sepia
darkness with slow drifting texture.
2.5–5s: Inside that darkness the texture of the ink slowly changes into the grain of developed film: the
swirling shapes flatten and settle into a warm dark-brown film emulsion; faint thin orange-amber filaments of
light appear, like the very first hint of light hitting the film; the dark edges of a film frame begin to
show softly at the left and right borders.
5–8s: Everything settles into a still, dark-brown analog film frame with soft black borders, gentle gate weave,
visible grain and a few faint glowing orange streaks drifting at the right edge, exactly matching the final
frame.

END (last frame): a dark brown, almost black analog film frame with faint orange-red light streaks at the
right edge and subtle film borders.

STYLE: one continuous shot, no cuts, no flashes, no white frames, slow and dreamlike, the motion of liquid
becoming the motion of light.
COLOR: sepia black, warm dark brown (#2A1A12), amber, faint terracotta-orange (#B4664A).
AUDIO: silence (the site plays it muted).
AVOID: hard cuts, white flashes, text, logos, faces, hands, objects other than ink and film, camera shake,
fast motion, new colours such as blue, green or purple.
```

**On the site:** save the result as `public/media/ink-to-leak.mp4`. Its time follows the scroll between the two
sections: scroll down and the ink turns into film, scroll back and it flows back into the bowl. Until the file
exists, the site cross-fades between the two clips instead. I'll re-encode the clip for smooth scrubbing myself,
so just send the original.

---

### Prompt formula (for anything else you want to generate)

`[duration + loop + aspect] · [film look + lens] · [ONE subject, physically described] ·
[ACTION as a 0–2 / 2–6 / 6–8 s timeline] · [ONE light source + its color in hex] ·
[palette in hex] · [camera: locked / ultra-slow push / ultra-slow dolly] · [mood in 3 words] ·
[audio: room tone, no music] · [AVOID: text, logos, faces, hands, neon, purple, fast motion, CGI gloss]`
