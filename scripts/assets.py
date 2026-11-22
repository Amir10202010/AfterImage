#!/usr/bin/env python3
"""
Single source of truth for Afterimage's generated images.

Writes:
  src/demo/roll.json     — what the app reads: the demo camera roll (file, date, time, caption),
                           only for photographs that actually exist in public/demo/roll
  PHOTO_PROMPTS.md       — 100 self-contained prompts for Nano Banana, one per file

Run:  python3 scripts/assets.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

FILM = (
    "Shot on 35mm film with a Kodak Portra 400 look: soft organic grain, natural light, gently faded highlights, "
    "lifted blacks, subtle vignette. Warm, muted palette of ivory (#F3EDE2), terracotta (#B4664A), faded burgundy (#7A2E2E) "
    "and muted olive (#6E6E45). Candid, unposed, intimate, like a page from a personal photo journal. Shallow depth of field, "
    "real photograph, not an illustration, not CGI."
)
NIGHT = (
    "Shot on 35mm film with a Kodak Vision3 500T look: tungsten and screen light, deep warm blacks, soft halation around light "
    "sources, visible grain. Palette of near-black (#0B0D0C), muted phosphor green (#B9C98F), amber (#E8C47A) and warm grey. "
    "Quiet, tired, honest, 3 a.m. atmosphere. Real photograph, not CGI."
)
OLD = (
    "Shot on an affordable 2019 smartphone, slightly noisy, warm desk-lamp white balance, a little soft, honest snapshot "
    "feeling of a teenager's life. Palette of warm lamplight amber, deep ink blue (#1E2433) and paper cream. Real photograph."
)
NO = (
    "Avoid: visible faces (show only hands, backs, silhouettes, or people far away and out of focus), readable text unless quoted "
    "in this prompt, logos, brand names, watermarks, neon, purple tones, oversaturated colors, plastic CGI look."
)
FLAT = (
    "Photographed perfectly top-down on a pure white (#FFFFFF) background, even soft studio light, only a very faint contact shadow, "
    "the object fully inside the frame with generous white margin, nothing else in frame, very high detail, true colors. "
    "Avoid: gradients in the background, props, hands, text, logos, watermarks."
)
TEXTURE = (
    "A flat, evenly lit, top-down scan of the material filling the entire frame edge to edge, no objects, no shadows, no vignette, "
    "no perspective, tileable-looking and calm, very high detail, true color. Avoid: text, logos, watermarks, borders."
)

assets = []


def add(**a):
    assets.append(a)


# ---------------------------------------------------------------- A · demo memories (3:2) — the darkroom's negatives
MEM = [
    ("autumn", "The Autumn Afternoon · main photograph", FILM,
     "Three friends sitting on a weathered green wooden park bench, seen from behind, in a park full of golden linden trees on a cold, "
     "sunny October afternoon (about 3 pm). One wears a mustard-yellow wool scarf. Three paper coffee cups and a steel thermos sit on the bench "
     "between them. Leaves are falling through low warm side light; a small pond glints in the background. Composition: bench in the lower "
     "third, trees filling the frame, lots of air. Feeling: nothing is happening and it is perfect."),
    ("autumn-2", "The Autumn Afternoon · the receipt", FILM,
     "Close-up of a crumpled paper café receipt half-pulled out of the pocket of a camel wool coat, a single yellow linden leaf stuck to the "
     "wool beside it. The receipt print is blurred and unreadable. Soft late-afternoon light, cold air feeling."),
    ("autumn-3", "The Autumn Afternoon · the scarf and the plaque", FILM,
     "A mustard-yellow chunky wool scarf draped over the slats of a green park bench, next to a small tarnished brass memorial plaque "
     "screwed into the backrest (engraving too small and worn to read). Golden leaves on the seat. Shallow depth of field on the scarf."),
    ("autumn-4", "The Autumn Afternoon · a leaf with no holes", FILM,
     "A perfect, unblemished yellow-orange linden leaf pressed flat and taped with a strip of kraft washi tape onto a cream page of an "
     "open notebook; a pencil lies diagonally across the page; warm desk light in the evening."),
    ("ambition", "The Ambition (2019) · main photograph", OLD,
     "A seventeen-year-old's bedroom desk at 11:40 pm in March 2019: a cheap black desk lamp casts a warm circle on an open lined notebook "
     "full of unreadable handwriting and arrows, a chewed pencil, a phone face down, an economics textbook, a mug with a heart, and a window "
     "behind with rain streaking down the dark glass. A paper calendar on the wall. Feeling: determined, a little angry, alone with a big plan."),
    ("ambition-2", "The Ambition · the tutorial", OLD,
     "An old laptop with a cracked corner on a bed, showing a blurred video coding tutorial (no readable text), a sticky note on the bezel, "
     "headphones tangled beside it, lamp light."),
    ("ambition-3", "The Ambition · the textbook nobody opened", OLD,
     "A thick, unopened medical textbook (cover blank, no title) at the bottom of a stack, with a well-worn economics notebook full of "
     "sticky tabs lying on top of it. Desk lamp light from the side. Symbolic, quiet."),
    ("night", "The Night Everything Was Due · main photograph", NIGHT,
     "A cramped desk in a fourth-floor studio flat at 3:47 am: a laptop whose screen glows green-grey with blurred terminal lines (unreadable), "
     "a yellow sticky note on the monitor bezel that says \"SHIP IT\" in black marker, three empty cans of cold brew, a wall clock, headphones, "
     "and a dark window with a few lit apartment windows across the street. Exhausted determination."),
    ("night-2", "The Night · the error", NIGHT,
     "Extreme close-up of a laptop screen at night: rows of blurred monospace text with one line glowing red, reflected faintly on the glossy "
     "screen is a desk lamp. Nothing readable. Shallow depth of field."),
    ("night-3", "The Night · cereal at 1 am", NIGHT,
     "A bowl of cereal with a spoon standing in it on the edge of a small kitchen sink at 1 am, a single harsh under-cabinet light, a phone "
     "playing music face up with a blurred album cover, dishes in the dark background."),
    ("night-4", "The Night · 05:12", NIGHT,
     "View from a fourth-floor window at dawn, 5:12 am: the sky turning grey-blue, rooftops and a street lamp still on, a row of small birds on "
     "a wire, the window frame and a laptop corner visible in the foreground. Relief."),
]
for key, where, style, subject in MEM:
    add(id=f"m-{key}", group="memory", file=f"demo/memories/{key}.jpg", aspect="3:2", where=where, prompt=f"{subject} {style} {NO}")

# ---------------------------------------------------------------- B · the demo camera roll (4:5) — journal, calendar, music box
# (date, time, fallback scene, caption or "", subject, style)
ROLL = [
    # September 2025
    ("2025-09-02", "08:20", "coffee", "first day back. same mug.", "A chipped cream ceramic mug of black coffee on a sunlit wooden windowsill, steam curling, a plant leaf at the edge.", FILM),
    ("2025-09-04", "19:10", "sunset", "", "Golden hour through a tram window: reflections of passengers' silhouettes over a blurred warm city street.", FILM),
    ("2025-09-06", "13:30", "tulips", "plums, finally", "A brown paper bag of dark purple plums on a farmers' market stall, a hand holding a few coins in the corner.", FILM),
    ("2025-09-07", "16:00", "book", "", "An open paperback face down on a striped picnic blanket in late-summer grass, round sunglasses and a peach beside it.", FILM),
    ("2025-09-10", "21:40", "lamp", "late shift", "A desk lamp over a sketchbook of loose pencil drawings of trees (no text), an eraser and pencil shavings.", FILM),
    ("2025-09-12", "18:50", "sunset", "", "Laundry drying on a line on a city rooftop at sunset, white sheets glowing orange, antennae against the sky.", FILM),
    ("2025-09-14", "11:00", "coffee", "Mira’s kitchen", "Two cups of tea on a worn wooden kitchen table in morning light, a mustard-yellow wool scarf hanging over the back of a chair.", FILM),
    ("2025-09-16", "07:40", "rain", "", "Raindrops on a bus window, blurred red tail lights and a cyclist in a yellow raincoat outside, early morning.", FILM),
    ("2025-09-19", "20:30", "city", "best show of the year", "A small concert seen from the middle of the crowd: warm stage lights and haze, raised hands as silhouettes, no faces.", FILM),
    ("2025-09-21", "15:20", "leaves", "the first yellow one", "A single yellow leaf resting on the slats of an empty green park bench, everything else still green.", FILM),
    ("2025-09-23", "12:40", "coffee", "", "A bowl of ramen seen from above on a narrow wooden counter, soft egg, nori, steam, chopsticks resting on the bowl.", FILM),
    ("2025-09-26", "18:15", "sunset", "", "A vintage bicycle leaning against a wooden fence beside a wheat field at sunset, long shadows.", FILM),
    ("2025-09-28", "10:30", "book", "vinyl sunday", "A record player's needle on a spinning vinyl record, morning sun across the platter, a coffee cup nearby.", FILM),
    ("2025-09-30", "22:10", "lamp", "", "A lit candle beside a handwritten letter in unreadable script on rumpled natural linen, a fountain pen.", FILM),
    # October 2025
    ("2025-10-01", "08:10", "coffee", "first cold morning. oat flat white.", "A takeaway coffee cup held in a knitted-glove hand on a cold morning, visible breath in the air, blurred street.", FILM),
    ("2025-10-02", "19:40", "sunset", "", "An old stone bridge over a river at dusk, street lamps just switching on, pink and amber sky.", FILM),
    ("2025-10-04", "21:30", "lamp", "staying in.", "A reading nook: a wool blanket on an armchair, a floor lamp, a stack of books and a mug of tea, rain on the window.", FILM),
    ("2025-10-06", "16:05", "rain", "rain all day, didn’t mind", "Rain droplets on a window in sharp focus with soft green trees blurred behind.", FILM),
    ("2025-10-08", "18:20", "rainbow", "the fence on the way home", "A faint rainbow over a white wooden fence and a green field with a dark hill, after rain.", FILM),
    ("2025-10-10", "12:00", "tulips", "Mira’s tulips, somehow still alive", "Pale pink tulips drooping elegantly in a clear glass vase on a sunny windowsill.", FILM),
    ("2025-10-12", "14:05", "leaves", "", "The wrought-iron gate of a city park on a cold sunny afternoon, golden linden trees beyond, leaves on the path.", FILM),
    ("2025-10-12", "14:40", "coffee", "", "Three oat flat whites in paper cups on a wooden ledge of a small kiosk by a pond, a steel thermos with no cups beside them.", FILM),
    ("2025-10-12", "15:10", "leaves", "", "An empty green park bench with a small brass plaque (unreadable) under falling golden linden leaves.", FILM),
    ("2025-10-12", "16:30", "sunset", "", "Low orange sun through linden trees; the long shadows of three people stretch across a leaf-covered path; the people themselves are out of frame.", FILM),
    ("2025-10-14", "22:15", "book", "one more chapter", "A book open on a duvet with tortoiseshell reading glasses resting on it, bedside lamp glow.", FILM),
    ("2025-10-15", "13:10", "coffee", "", "A bowl of pumpkin soup with a swirl of cream and a torn piece of sourdough on a linen napkin.", FILM),
    ("2025-10-17", "18:55", "sunset", "the sky did that", "Dramatic pink and orange clouds over city rooftops and chimneys at sunset.", FILM),
    ("2025-10-19", "20:30", "city", "", "A wet cobblestone street at night reflecting warm street lamps, an umbrella-holding silhouette far away.", FILM),
    ("2025-10-21", "09:00", "rain", "", "A dripping umbrella leaning in a doorway on a rainy morning, wet tiles.", FILM),
    ("2025-10-22", "17:40", "tulips", "", "Buckets of dried flowers, eucalyptus and pampas grass outside a small flower shop.", FILM),
    ("2025-10-23", "17:30", "leaves", "kept the ones without holes", "A hand holding a small bouquet of perfect autumn leaves in yellow, orange and red.", FILM),
    ("2025-10-25", "11:30", "book", "", "An empty wooden bench in a quiet museum gallery facing a large blurred landscape painting.", FILM),
    ("2025-10-26", "11:20", "coffee", "", "A croissant and a cappuccino on a round marble café table, morning light, a folded newspaper (unreadable).", FILM),
    ("2025-10-27", "16:00", "leaves", "", "A golden retriever lying in a pile of fallen leaves, seen from above, happy and sleepy.", FILM),
    ("2025-10-28", "21:50", "lamp", "", "Rows of red velvet cinema seats lit only by the glow of the screen, an empty seat in the foreground.", FILM),
    ("2025-10-29", "07:50", "rain", "", "A foggy morning field with a line of power poles fading into white.", FILM),
    ("2025-10-30", "18:10", "sunset", "", "Sunset through a train window, fields rushing by, a paper cup on the window ledge.", FILM),
    ("2025-10-31", "20:00", "lamp", "", "A carved pumpkin with a candle inside glowing on a stone doorstep at night.", FILM),
    # November 2025
    ("2025-11-02", "10:30", "book", "", "A long library aisle of old books in warm light, a rolling ladder.", FILM),
    ("2025-11-03", "18:00", "coffee", "Lena’s dinner", "A dinner table from above with candles, a big bowl of pasta, glasses of wine and several hands reaching in.", FILM),
    ("2025-11-05", "23:10", "city", "everyone’s asleep but the windows", "An apartment block at night with only a few windows lit warm yellow.", NIGHT),
    ("2025-11-07", "08:30", "rain", "", "Delicate first-frost patterns on a car windshield in early morning light.", FILM),
    ("2025-11-09", "13:40", "tulips", "", "Dried blue-and-beige hydrangeas in a glass jar on a wooden shelf.", FILM),
    ("2025-11-11", "17:20", "sunset", "", "Cold blue hour over a river, city lights just starting, mist over the water.", FILM),
    ("2025-11-13", "17:05", "rain", "", "A tram stop in sleet under a yellow street lamp, a lone figure far away.", NIGHT),
    ("2025-11-15", "12:00", "coffee", "", "A mug of hot chocolate with marshmallows held in two hands wearing wool mittens.", FILM),
    ("2025-11-17", "22:40", "lamp", "deadline in three days. fine. FINE.", "A laptop on a messy desk at night with blurred code on the screen, colorful sticky notes, a half-empty mug.", NIGHT),
    ("2025-11-19", "01:30", "city", "", "An empty 24-hour corner shop at night seen from the street, fluorescent light spilling onto wet pavement.", NIGHT),
    ("2025-11-20", "21:30", "lamp", "", "A laptop just opened on a small desk in a studio flat at 9:30 pm, a blank document on screen (unreadable), a lamp and a notebook.", NIGHT),
    ("2025-11-21", "01:05", "coffee", "", "A bowl of cereal next to a kitchen sink under harsh light at 1 am.", NIGHT),
    ("2025-11-21", "03:47", "lamp", "", "Three empty cans of cold brew lined up next to a laptop; on the monitor bezel a yellow sticky note reads \"SHIP IT\".", NIGHT),
    ("2025-11-21", "05:12", "sunset", "submitted. birds.", "Grey-blue dawn from a fourth-floor window, small birds sitting on a wire, a street lamp still on.", NIGHT),
    ("2025-11-23", "14:00", "book", "slept twelve hours", "A rumpled bed with crisp white sheets in soft afternoon sun, a phone face down on the pillow.", FILM),
    ("2025-11-24", "12:30", "coffee", "", "A brunch table from above with pancakes, berries, coffee cups and several friends' hands.", FILM),
    # March 2019 (The Ambition)
    ("2019-03-01", "16:00", "rain", "", "A school corridor window streaked with rain, lockers blurred in the foreground, grey afternoon.", OLD),
    ("2019-03-02", "20:10", "book", "", "An economics textbook open next to a notebook full of doodled graphs and arrows (unreadable), a highlighter.", OLD),
    ("2019-03-03", "23:40", "lamp", "", "A desk lamp, an open notebook and rain on a dark window late at night, a teenager's room.", OLD),
    ("2019-03-05", "07:30", "coffee", "", "Breakfast before school: toast with jam and a cup of tea on a kitchen table, a school backpack on the chair.", OLD),
    ("2019-03-08", "18:30", "sunset", "", "A city at early spring dusk seen from the back seat window of a bus, wet glass.", OLD),
    ("2019-03-10", "15:00", "city", "", "A skateboard lying on the concrete of an empty skate park on an overcast day.", OLD),
]
for i, (date, time, scene, caption, subject, style) in enumerate(ROLL):
    slug = f"{date}-{time.replace(':', '')}"
    add(id=f"r-{i:02d}", group="roll", file=f"demo/roll/{slug}.jpg", aspect="4:5", date=date, time=time, scene=scene,
        caption=caption, where=f"Journal · {date} {time}" + (f" · caption “{caption}”" if caption else ""),
        prompt=f"Vertical photograph. {subject} {style} {NO}")

# ---------------------------------------------------------------- C · materials (1:1) — the paper room, notebook, desk, music box
TEX = [
    ("paper-ivory", "Month board and notebook pages", "Warm ivory cotton watercolor paper with a very subtle fiber texture and faint mottling, color #F3EDE2."),
    ("kraft", "Notebook cover around the spread", "Tan kraft paper / soft leather-like card with fine fibers and slight creases, color #B48B5C."),
    ("oak", "The desk under the notebook", "Light oak wood planks seen from directly above, straight grain running horizontally, satin finish, warm honey tone."),
    ("velvet", "Inside the music box", "Deep burgundy crushed velvet fabric, soft sheen, color #4A1820."),
    ("linen", "Letters and envelopes", "Natural undyed linen fabric with a gentle weave, soft and slightly wrinkled, color #E6DCCB."),
    ("dotgrid", "Journal pages (alternative)", "A cream notebook page with a faint dot grid, slightly yellowed edges, color #FBF8F1, dots in light grey-brown."),
]
for key, where, subject in TEX:
    add(id=f"t-{key}", group="texture", file=f"demo/textures/{key}.jpg", aspect="1:1", where=where, prompt=f"Square texture. {subject} {TEXTURE}")

# ---------------------------------------------------------------- D · scrapbook pieces (1:1, white background) — stickers and tape
SCRAP = [
    ("sticker-flower", "Sticker · pressed white cosmos", "A single pressed white cosmos flower with a thin olive-green stem and two small leaves, dried flat, delicate translucent petals."),
    ("sticker-flower2", "Sticker · pressed pink flower", "A pressed small pink wild rose with its stem, dried flat, faded petals, a few tiny leaves."),
    ("sticker-flower3", "Sticker · pressed fern", "A pressed green fern frond dried flat, slightly brown at the tips."),
    ("sticker-leaf", "Sticker · autumn leaf", "A single pressed orange-red autumn maple leaf, dried flat, crisp veins."),
    ("sticker-camera", "Sticker · film camera", "A die-cut glossy vinyl sticker of a vintage rangefinder film camera drawn in a soft vintage illustration style, cream body, brown leather, with a thin white sticker border."),
    ("sticker-stamp", "Sticker · postage stamp (landscape)", "A vintage postage stamp with perforated edges showing an engraved landscape of hills and a small house in terracotta ink, no country name, no readable text."),
    ("sticker-stamp2", "Sticker · postage stamp (flower)", "A vintage postage stamp with perforated edges showing an engraved tulip in faded green and pink, no readable text."),
    ("sticker-stamp3", "Sticker · postage stamp (bird)", "A vintage postage stamp with perforated edges showing an engraved swallow in deep blue, faint wavy cancellation lines, no readable text."),
    ("sticker-ticket", "Sticker · cinema ticket", "A single torn mustard-yellow paper admission ticket stub with perforated edge and a printed serial number \"No 47104\", slightly creased."),
    ("sticker-heart", "Sticker · ink heart", "A small hand-drawn heart doodle in burgundy ink on a scrap of cream paper with torn edges."),
    ("sticker-star", "Sticker · gold star", "A single shiny gold foil star sticker, slightly crinkled."),
    ("sticker-clip", "Sticker · paper clip", "A single brass paper clip, slightly tarnished, lying diagonally."),
    ("sticker-wax", "Sticker · wax seal", "A burgundy wax seal with an abstract pressed mark (no letters), irregular dripped edge, on nothing else."),
    ("tape-kraft", "Washi tape · kraft", "A single torn strip of kraft-colored washi tape, slightly translucent, both ends torn irregularly, laid horizontally."),
    ("tape-grid", "Washi tape · sage grid", "A single torn strip of sage-green washi tape with a fine white grid pattern, slightly translucent, laid horizontally."),
    ("tape-flower", "Washi tape · flowers", "A single torn strip of dusty-pink washi tape with tiny cream flowers, slightly translucent, laid horizontally."),
    ("tape-red", "Washi tape · red stripes", "A single torn strip of washi tape with diagonal faded-red and cream stripes, slightly translucent, laid horizontally."),
]
for key, where, subject in SCRAP:
    add(id=f"s-{key}", group="scrap", file=f"demo/scrap/{key}.png", aspect="1:1", where=where, prompt=f"Square image. {subject} {FLAT}")

# ---------------------------------------------------------------- E · interface pictures
UI = [
    ("og", "media/og.jpg", "1.91:1", "Link preview when the site is shared",
     "Wide cinematic still life: a darkroom at night under a deep red safelight, an enamel developing tray on a walnut bench with a photograph of three friends on an autumn bench emerging in the liquid, film negatives hanging on a string above, generous empty dark space on the left third for a title. " + FILM),
    ("welcome", "demo/ui/welcome.jpg", "16:9", "First step of the guided tour",
     "A warm, inviting still life: an open traveler's notebook full of instant photos and ticket stubs, a strip of film negatives, a wax-sealed envelope and a cup of tea on an oak desk in soft morning light. " + FILM),
    ("empty-journal", "demo/ui/empty-journal.jpg", "3:2", "Journal with no photos yet",
     "An empty open notebook with cream pages, a few blank instant-film frames and a roll of washi tape waiting on an oak desk, soft light, hopeful emptiness. " + FILM),
    ("empty-memories", "demo/ui/empty-memories.jpg", "3:2", "Memories with nothing saved yet",
     "An empty string with five wooden clothespins hanging in a dim darkroom, red safelight glow, waiting for the first negative. " + FILM),
    ("empty-letters", "demo/ui/empty-letters.jpg", "3:2", "Letters with nothing written yet",
     "A blank cream envelope, an unused burgundy wax stick, a brass seal stamp and a fountain pen on natural linen by candlelight. " + FILM),
    ("connect", "demo/ui/connect.jpg", "16:9", "Top of the ‘Bring in photos’ screen",
     "A shoebox full of loose printed photographs, instant photos and film negatives spilling onto a wooden floor in afternoon light, a phone lying among them showing a blurred grid of photos. " + FILM),
]
for key, file, aspect, where, subject in UI:
    add(id=f"u-{key}", group="ui", file=file, aspect=aspect, where=where, prompt=f"{subject} {NO}")

assert len(assets) == 100, len(assets)

# ---------------------------------------------------------------- write outputs
# The app only needs the roll, and only the photographs that exist: a caption without its picture
# would otherwise fall back to a drawing in the middle of a roll of real photographs.
roll = [
    {k: a[k] for k in ("file", "date", "time", "scene", "caption")}
    for a in assets
    if a["group"] == "roll" and (ROOT / "public" / a["file"]).exists()
]
(ROOT / "src/demo/roll.json").write_text(json.dumps(roll, ensure_ascii=False, indent=1) + "\n")

GROUPS = [
    ("memory", "A · Demo memories (11)", "The three demo days in the darkroom. The first photo of each is the negative you develop; the rest appear in the print’s contact strip. **Landscape 3:2.**"),
    ("roll", "B · The demo camera roll (60)", "Fills the Journal calendar for September–November 2025 and March 2019, the notebook pages, the Test Strip and the Music box (each photo’s colours become notes). **Portrait 4:5.**"),
    ("texture", "C · Materials (6)", "Real paper, wood, velvet and linen under the interface. **Square 1:1, 2048 px if possible.**"),
    ("scrap", "D · Scrapbook pieces (17)", "Stickers and washi tape for the notebook pages. Generated on **pure white** as PNG, then cut out to transparent WebP with `python3 scripts/cutout_scrap.py`. **Square 1:1.**"),
    ("ui", "E · Interface pictures (6)", "Link preview, tour, empty states, the import screen."),
]
md = [
    "# 100 Nano Banana prompts for Afterimage",
    "",
    "Every prompt below is self-contained: copy it as is. The **file name** shows where to save the result — the site picks each file up automatically",
    "and falls back to the drawn version when a file is missing. After adding files, open **Settings → Restore demo days** once so the demo",
    "journal and the three demo memories switch to your photos.",
    "",
    "**Tips**",
    "- Set the aspect ratio in Nano Banana to the one written next to each prompt.",
    "- Keep the batch consistent: generate a group in one session, and reuse the same film-look sentence (it’s already in every prompt).",
    "- If a face sneaks in, add “seen from behind” or regenerate — the demo person and their friends are never shown.",
    "- Save every picture under exactly the file name shown. The app matches pictures to captions by name, so a batch saved",
    "  one position off puts every caption on the wrong photograph.",
    "- Save photos as JPEG (quality ~85). Save stickers and tape as PNG, then run `python3 scripts/cutout_scrap.py`.",
    "- Size: about 1600 px on the long side for photos is plenty; the app resizes everything on the device anyway.",
    "",
]
n = 0
for g, title, note in GROUPS:
    md += [f"## {title}", "", note, ""]
    for a in [x for x in assets if x["group"] == g]:
        n += 1
        md += [f"### {n}. `public/{a['file']}` · {a['aspect']}", f"*{a['where']}*", "", "```text", a["prompt"], "```", ""]
(ROOT / "PHOTO_PROMPTS.md").write_text("\n".join(md))
print("wrote", len(assets), "prompts and", len(roll), "roll photos")
