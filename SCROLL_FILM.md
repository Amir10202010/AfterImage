# The scroll film: eight chained Veo clips, played by scrolling

**What it replaces:** the vector ink line in the middle of the landing (from “We take thousands of photographs” down
to “Hear your month”).

**What it becomes:** one continuous 64-second shot made of eight 8-second Veo clips, each starting on the exact
last frame of the one before. The site pins it full-screen (16:9) behind the blocks and **ties its time to the
scroll**. Scroll down and the film plays forward; scroll up and the ink flows backwards, the splashes gather back
into drops, and every move rewinds. The text and each block’s own clip appear *inside the shapes the ink draws*.
The goal is the reaction “how did they animate that?”, made only of video.

```
hero.mp4 ─▶ 01 INTO THE PAPER ─▶ 02 THE DROP ─▶ 03 THE FRAME ─▶ 04 THE LINE ─▶ 05 THE SEAL ─▶ 06 THE RINGS ─▶ 07 THE NOTES ─▶ 08 INTO THE BOWL ─▶ ink.mp4
(last frame)    starts on hero’s    manifesto      Journal         Darkroom        Letters         Enlarger        Music box        ends on ink’s
                last frame                                                                                                          first frame
```

The first and last links are already fixed:

| File | Use it as |
|---|---|
| `frames/hero-LAST-frame.png` | **first frame** of clip 01 |
| `frames/ink-FIRST-frame.png` | **last frame** of clip 08 |

---

## How to chain the clips

1. Generate **01** with *frames to video*: first frame `frames/hero-LAST-frame.png`, no last frame.
2. Take its last frame and use it as the **first frame of 02**:

```bash
ffmpeg -sseof -0.05 -i 01.mp4 -frames:v 1 -update 1 frames/01-LAST.png
```

3. Repeat for every clip: the last frame of N becomes the first frame of N+1.
4. For **08**, also set the **last frame** to `frames/ink-FIRST-frame.png`. The film then flows straight into the
   bowl of the next section.
5. Send me the eight originals. I’ll join them, re-encode them for smooth reverse scrubbing, and place the
   blocks inside the shapes.

**Pick takes for:** an even speed (scroll maps directly onto time), a calm last second (it’s the next clip’s
first frame), and how well the empty zones are respected (see below).

---

## Layout rules: the ink has to leave room for the website

Each block clip has **two zones** on screen:

- **Window**: the area where the ink draws a shape (a frame, a ring, a line of drops). The site places the
  block’s own video inside it, so the inside of the window must stay **empty ivory paper**.
- **Text side**: the opposite half of the screen, which must stay **completely clean**. The heading and
  paragraph go there.

| Clip | Block | Window (where the ink draws) | Text side (clean) |
|---|---|---|---|
| 02 | Manifesto | none, centred text | middle band, 30–70% of height |
| 03 | Journal | **left**: 7–49% width, 18–82% height | right half |
| 04 | Darkroom | **right**: 51–93% width, 18–82% height | left half |
| 05 | Letters | **left** | right half |
| 06 | Enlarger | **right** | left half |
| 07 | Music box | **left** | right half |

**The rhythm of every block clip** (it carries the scroll):

- **0–1.5 s:** the ink thread enters from the top centre, continuing from the previous clip;
- **1.5–6 s:** the ink performs its shape around the window; the shape holds still for a moment, because that is
  when the text appears;
- **6–8 s:** the camera glides down over the paper, so the finished shape slides up and out of the frame and the
  thread runs on to the bottom centre. The last frame is nearly empty paper with the thread going down,
  so the next clip starts clean.

---

## Style bible (already included in every prompt below)

> Ultra-detailed macro tabletop film, 16:9, 8 seconds. A vast sheet of smooth ivory cotton paper (#F3EDE2) seen from
> slightly above, like a miniature landscape. The ink is deep burgundy (#7A2E2E) behaving like a high-end
> fluid simulation: a glossy, three-dimensional living thread of liquid with real surface tension, a rounded wet
> bead at its leading tip, specular highlights, a soft contact shadow on the paper, fine capillary feathering where
> it touches the fibres, and tiny satellite droplets when it moves fast. Splashes form crowns and beads in slow
> motion and land as crisp splatter dots. Light: soft warm window light from the upper left, shallow depth of field
> (macro, f/2.8), subtle 35mm film grain. Colour palette only: ivory, burgundy, terracotta (#B4664A), a little
> sepia. Photoreal, tactile, poetic: a darkroom’s ink coming alive.
>
> Avoid: text, letters, numbers, logos, hands, brushes, pens, people, faces, cuts, flashes, colour changes of the paper,
> neon, purple, blue, CGI plastic look, chaotic camera shake.

---

## 01 · INTO THE PAPER (hero → paper world)
**First frame:** `frames/hero-LAST-frame.png` · no last frame

```
Continuous macro shot, 16:9, 8 seconds, 35mm film grain.

START: an enamel developing tray under a deep red darkroom safelight; in the liquid lies a finished photograph
of three friends on a park bench under golden autumn trees.

ACTION:
0–3s: The camera slowly descends toward the photograph and sinks gently through the surface of the developer.
Ripples spread across the picture and the red light warms into amber.
3–6s: Passing through the liquid, the photograph's paper grows enormous and pale; the image itself fades and
dissolves, its last golden tones melting away, until the camera floats above a vast, empty sheet of smooth ivory
cotton paper (#F3EDE2), lit by soft warm window light from the upper left. The red light is gone.
6–8s: Calm. Empty ivory paper fills the whole frame; a single tiny dark burgundy bead of ink appears high above,
out of focus, starting to fall toward the centre of the paper.

Photoreal, seamless, dreamlike, one continuous move, no cuts. Shallow depth of field, subtle film grain.
Avoid: text, logos, faces in detail, hands, cuts, white flashes, colour shifts to blue or purple.
```

## 02 · THE DROP (manifesto: “We take thousands of photographs…”)
**First frame:** last frame of 01 · Window: none, keep the middle band (30–70% height) clean for centred text

```
Ultra-detailed macro tabletop film, 16:9, 8 seconds. Vast smooth ivory cotton paper (#F3EDE2) seen from slightly
above, soft warm window light from the upper left, shallow depth of field, subtle 35mm grain.

ACTION:
0–2s: A single glossy drop of deep burgundy ink (#7A2E2E) falls in extreme slow motion and strikes the paper at the
top centre of the frame (about 15% from the top).
2–4s: It bursts into a perfect slow-motion crown splash; dozens of tiny beads fly outward in elegant arcs and land as
crisp splatter dots in a loose halo near the top of the frame, none of them landing in the middle band of the paper.
4–6s: From the centre of the splash, the ink gathers itself into one glossy, three-dimensional living thread of
liquid with a rounded wet bead at its tip. It hesitates, as if alive, then begins to crawl along the right edge of the
frame, curling once.
6–8s: The camera glides smoothly down over the paper; the splash slides up and out of frame, and the thread runs down
toward the bottom centre, leaving the middle of the frame as clean, empty ivory paper.

Fluid behaves like a high-end simulation: real surface tension, specular highlights, soft contact shadow, capillary
feathering into the paper fibres. Photoreal, poetic, tactile.
Avoid: anything crossing the middle band of the frame, text, logos, hands, brushes, cuts, flashes, colour changes of
the paper, neon, purple, CGI plastic look.
```

## 03 · THE FRAME (Journal)
**First frame:** last frame of 02 · Window **LEFT** (7–49% width, 18–82% height) · right half stays clean

```
Ultra-detailed macro tabletop film, 16:9, 8 seconds. Vast smooth ivory cotton paper (#F3EDE2), slightly elevated view,
soft warm light from the upper left, shallow depth of field, subtle 35mm grain.

ACTION:
0–1.5s: A glossy, three-dimensional thread of deep burgundy ink (#7A2E2E) with a wet bead at its tip enters from the top
centre of the frame and veers to the left.
1.5–5s: Moving with confident, almost choreographed grace, it draws a large rectangular picture frame on the LEFT half
of the paper (from about 7% to 49% of the width and 18% to 82% of the height), like the border of an instant photo
with a slightly wider bottom edge. At each corner it loops once, leaving a small pool, and three short strips of
liquid ink peel up from the corners like washi tape, glistening, before settling flat. Tiny splatter dots spray
outward from the corners, away from the right half. The inside of the frame stays perfectly empty ivory paper.
5–6s: The finished frame holds still, wet and gleaming, catching the light.
6–8s: The camera glides down; the frame slides up and out of view; the thread leaves the bottom-left corner and runs to
the bottom centre of the frame.

The right half of the frame stays completely clean, empty ivory paper the whole time.
Fluid: real surface tension, specular highlights, soft contact shadows, capillary feathering. Photoreal, satisfying.
Avoid: ink on the right half, anything inside the drawn frame, text, logos, hands, tools, cuts, flashes, neon, purple,
CGI plastic look.
```

## 04 · THE LINE (Darkroom)
**First frame:** last frame of 03 · Window **RIGHT** (51–93% width, 18–82% height) · left half stays clean

```
Ultra-detailed macro tabletop film, 16:9, 8 seconds. Vast smooth ivory cotton paper (#F3EDE2), slightly elevated view,
soft warm light from the upper left, shallow depth of field, subtle 35mm grain.

ACTION:
0–1.5s: The glossy, three-dimensional burgundy ink thread (#7A2E2E) with a wet bead at its tip enters from the top centre
and sweeps to the right.
1.5–5s: Across the upper part of the RIGHT half (about 51% to 93% of the width, at 22% of the height) the thread lifts
off the paper and pulls taut into a three-dimensional wet line strung through the air like a clothesline, casting
a soft shadow on the paper below. Five heavy drops of ink gather along it and slowly stretch downward, each
hanging like a small rectangle of film from the line, glossy and translucent at the edges, then settle into
place. Two drops fall and land on the paper below as crisp splatter dots. Underneath the line, the space
(down to 82% of the height) stays empty ivory paper.
5–6s: The line and its hanging drops sway once and hold still, glistening.
6–8s: The camera glides down; the line slides up and out of frame; the thread continues from the right end of the line
down to the bottom centre of the frame.

The left half of the frame stays completely clean, empty ivory paper the whole time.
Fluid: surface tension, slow-motion stretching drops, specular highlights, soft shadows. Photoreal, hypnotic.
Avoid: ink on the left half, text, logos, hands, real clothespins, cuts, flashes, neon, purple, CGI plastic look.
```

## 05 · THE SEAL (Letters)
**First frame:** last frame of 04 · Window **LEFT** · right half stays clean

```
Ultra-detailed macro tabletop film, 16:9, 8 seconds. Vast smooth ivory cotton paper (#F3EDE2), slightly elevated view,
soft warm light from the upper left, shallow depth of field, subtle 35mm grain.

ACTION:
0–1.5s: The glossy, three-dimensional burgundy ink thread (#7A2E2E) enters from the top centre and spirals to the left.
1.5–4s: On the LEFT half (about 7% to 49% of the width, 18% to 82% of the height) the thread folds the paper itself:
it traces the outline of a large envelope: a rectangle with the two diagonal lines of a closed flap meeting at
the centre. Where the flap lines meet, ink wells up into a thick, round, glossy pool.
4–5.5s: The pool thickens and rises into a three-dimensional wax-like seal of deep burgundy, its edge rippling outward
in an irregular drip; it gently presses itself flat with a soft circular imprint (an abstract swirl, no letters). The
rest of the envelope's inside stays empty ivory paper.
5.5–6s: The seal sets and gleams; a single tiny drop rolls away.
6–8s: The camera glides down; the envelope slides up and out of frame; the thread leaves from the bottom of the seal and
runs to the bottom centre.

The right half of the frame stays completely clean, empty ivory paper the whole time.
Fluid and wax: viscous, glossy, real surface tension, soft shadows. Photoreal, intimate.
Avoid: ink on the right half, letters or symbols in the seal, text, logos, hands, real wax sticks, cuts, flashes, neon,
purple, CGI plastic look.
```

## 06 · THE RINGS (Enlarger: connections)
**First frame:** last frame of 05 · Window **RIGHT** · left half stays clean

```
Ultra-detailed macro tabletop film, 16:9, 8 seconds. Vast smooth ivory cotton paper (#F3EDE2), slightly elevated view,
soft warm light from the upper left, shallow depth of field, subtle 35mm grain.

ACTION:
0–1.5s: The glossy, three-dimensional burgundy ink thread (#7A2E2E) enters from the top centre, swings right and splits
into two threads: one deep burgundy, one warm terracotta (#B4664A).
1.5–4.5s: On the RIGHT half (about 51% to 93% of the width, 18% to 82% of the height) the two threads draw two large
circles that orbit each other and slide together until they overlap like a Venn diagram, the way two transparencies
align on a light table. Where they cross, the two inks blend into a darker glowing seam, and a burst of fine
droplets sprays outward in a slow-motion halo, landing as tiny dots away from the left half.
4.5–6s: The two rings lock into perfect register and hold still; the shared lens-shaped area in the middle catches a
soft highlight. The insides of the rings stay empty ivory paper.
6–8s: The camera glides down; the rings slide up and out of frame; the two threads braid back into one and run to the
bottom centre of the frame.

The left half of the frame stays completely clean, empty ivory paper the whole time.
Fluid: surface tension, two inks mixing at the seam, specular highlights, soft shadows. Photoreal, mesmerising.
Avoid: ink on the left half, text, logos, hands, tools, cuts, flashes, colours other than burgundy and terracotta, neon,
purple, CGI plastic look.
```

## 07 · THE NOTES (Music box)
**First frame:** last frame of 06 · Window **LEFT** · right half stays clean

```
Ultra-detailed macro tabletop film, 16:9, 8 seconds. Vast smooth ivory cotton paper (#F3EDE2), slightly elevated view,
soft warm light from the upper left, shallow depth of field, subtle 35mm grain.

ACTION:
0–1.5s: The glossy, three-dimensional burgundy ink thread (#7A2E2E) enters from the top centre and swings left.
1.5–5s: On the LEFT half (about 7% to 49% of the width, 18% to 82% of the height) the thread lays down five perfectly
parallel horizontal lines like a musical stave, then lifts its tip and starts to bounce rhythmically along them,
leaving a trail of round, glossy, three-dimensional ink beads at different heights, like notes punched into a
music-box paper strip. Each bead lands with a tiny satisfying bounce and a ring of micro-splatter, in a steady
rhythm, from left to right.
5–6s: The last bead lands; all the beads tremble once in unison, as if they had just sounded, then hold still.
6–8s: The camera glides down; the stave slides up and out of frame; the thread gathers itself and runs, faster now,
toward the bottom centre of the frame.

The right half of the frame stays completely clean, empty ivory paper the whole time.
Fluid: surface tension, bouncing beads, specular highlights, soft shadows. Photoreal, rhythmic, joyful.
Avoid: ink on the right half, real musical symbols, clefs, numbers, text, logos, hands, cuts, flashes, neon, purple,
CGI plastic look.
```

## 08 · INTO THE BOWL (bridge to “Nothing leaves your device”)
**First frame:** last frame of 07 · **Last frame:** `frames/ink-FIRST-frame.png`

```
Ultra-detailed macro film, 16:9, 8 seconds, subtle 35mm grain, one continuous shot.

START: a vast sheet of ivory paper with a glossy burgundy ink thread running down to the bottom centre.

ACTION:
0–3s: The thread runs to the bottom edge and pours over it like a tiny waterfall. The camera follows it over the edge
and tilts down: below the paper, in soft light, is a white porcelain bowl filled with perfectly still clear water.
3–6s: The stream of ink thins as it falls, stretching into a long glossy strand, then breaks into a single, round,
dark drop that hangs for a moment.
6–8s: The drop falls toward the centre of the still water of the white bowl; the composition settles into a calm
top-down view of the clean white bowl with the single dark drop just above the surface, exactly matching the final
frame.

Fluid: surface tension, glossy highlights, slow motion. Light: soft and cool-neutral, white porcelain, no red.
Photoreal, quiet, seamless.
Avoid: splashes before the final frame, text, logos, hands, cuts, flashes, colour changes, CGI plastic look.
```

---

## When the clips arrive, I will:
- join the eight clips into one film and encode it so it scrubs smoothly in both directions (a keyframe on
  almost every frame);
- pin it full-screen behind the middle of the landing, so 64 seconds of film spread over the scroll, about one
  and a half screens per clip;
- for each block, place its heading and paragraph on the clean side and its own clip **inside the shape the ink
  drew**, moving together with the camera glide at the end of each clip;
- keep the vector line as the fallback for phones with weak connections and for reduced motion;
- on phones (portrait), crop the film to the active half and let the text sit above it.
