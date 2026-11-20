# Veo 3.1 Lite: дневник → фото Парижа → мы в Париже

Один непрерывный «пролёт» из трёх клипов по 8 секунд, без склеек. На сайте он ставится фоном под лендинг, а **время видео
привязывается к скроллу**: крутишь вниз — дневник открывается, листается, камера влетает в фото и оказывается в Париже;
крутишь вверх — всё отматывается назад. Каждая перевёрнутая страница — граница новой секции лендинга.

```
01 ДНЕВНИК ОТКРЫВАЕТСЯ ─▶ 02 ВНУТРЬ ФОТО ─▶ 03 МЫ В ПАРИЖЕ
 (hero, manifesto)          (Journal)          (Darkroom … Music box)
```

## Как генерировать

| Клип | Статус | First frame | Last frame |
|---|---|---|---|
| **01** дневник открывается | ✅ готов: `veo/01-diary.mp4` | `frames/hero-LAST-frame.png` | — |
| **02** внутрь фото | делать | **`frames/01-diary-LAST.png`** | не задавать |
| **03** мы в Париже | после 02 | `frames/02-LAST.png` (последний кадр 02) | не задавать |
| **04** обратно в дневник (бонус) | по желанию | `frames/03-LAST.png` | `frames/01-diary-LAST.png`, если есть поле |

Последний кадр каждого клипа вытаскивается так (именно `-0.3`: с `-0.05` у Veo-клипов кадр не находится):

```bash
ffmpeg -sseof -0.3 -i veo/02.mp4 -an -update 1 frames/02-LAST.png
ffmpeg -sseof -0.3 -i veo/03.mp4 -an -update 1 frames/03-LAST.png
```

Сохраняй клипы как `veo/02.mp4`, `veo/03.mp4`, `veo/04.mp4` (или просто кидай мне, я сам положу).

Настройки: **16:9, 8 s, 1080p (или 720p), звук не нужен**. Генерируй 2–4 дубля и выбирай.

**Какой дубль брать:** камера движется **ровно, с постоянной скоростью** (скролл = время), **без склеек и резких рывков**,
**никаких людей**, последняя секунда спокойная (это первый кадр следующего клипа).

Потом пришли мне три файла — я склею их и перекодирую так, чтобы каждый кадр был ключевым (для плавной перемотки скроллом):

```bash
ffmpeg -i 01.mp4 -i 02.mp4 -i 03.mp4 -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1[v]" -map "[v]" -an \
  -c:v libx264 -crf 24 -g 1 -pix_fmt yuv420p -movflags +faststart public/media/paris-scroll.mp4
```

---

## Стиль (уже вшит в каждый промт)

> Cinematic macro-to-wide tabletop film, warm analog look, 35mm Kodak Portra 400 grain, soft halation, gently faded
> highlights, lifted blacks. Palette: ivory paper (#F3EDE2), terracotta (#B4664A), faded burgundy (#7A2E2E), muted olive,
> honey-gold lamplight. One continuous take, no cuts, slow and perfectly steady camera at a constant speed.
> No people, no faces, no hands, no animals, no readable text, no logos, no watermarks.

---

## 01 · The diary opens — 8 s

```text
One continuous take, no cuts. Overhead-to-low-angle cinematic shot on a dark oak desk at golden hour. A thick, worn leather travel diary with a burgundy elastic band lies closed beside a brass key, a dried lavender sprig and a cold cup of coffee. Warm low sunlight slides across the desk, dust motes float in the beam. 0–2 s: the elastic band slips off on its own and the cover lifts slowly, as if a soft breeze opened it. 2–6 s: the pages flutter and turn by themselves, one after another, each page full of taped polaroids, ticket stubs, pressed leaves, washi tape and faint handwriting that is never readable; every page turn is a big, graceful arc that catches the light. 6–8 s: the pages settle open on a spread with a single large vintage photograph of a Paris street at blue hour taped in the centre, and the camera begins to glide down toward it. The camera moves smoothly and steadily, at a constant speed, gently descending. Warm analog look, 35mm Kodak Portra 400 grain, soft halation, gently faded highlights, lifted blacks. Palette: ivory paper (#F3EDE2), terracotta (#B4664A), faded burgundy (#7A2E2E), muted olive, honey-gold lamplight. Shallow depth of field, real photography, not CGI, not illustration. No people, no faces, no hands, no animals, no readable text, no logos, no watermarks.
```

## 02 · Into the photograph — 8 s

*(first frame = `frames/01-diary-LAST.png`)*

```text
One continuous take, no cuts. Starting on an open leather diary with a vintage photograph of a Paris street at blue hour taped in the centre of the page. The camera pushes in slowly and steadily toward the photograph at a constant speed. 0–3 s: the taped edges, the paper grain and the photo's white border fill the frame; the photograph's surface shows fine film grain and a soft gloss. 3–6 s: the border slides out past the edges of the frame and the still photograph comes alive: the gas lamps flicker on, light rain begins to fall, puddles start to ripple, a café awning breathes in the wind, the clouds drift. The paper texture dissolves gently into real air and depth, parallax opens up between the foreground lamp post and the buildings behind. 6–8 s: we are now inside the real street, gliding forward between empty café chairs on wet cobblestones toward a cross street, warm windows glowing. Smooth, steady forward dolly, constant speed, no shake. Warm analog look, 35mm Kodak Portra 400 grain, soft halation, gently faded highlights, lifted blacks. Palette: ivory (#F3EDE2), terracotta (#B4664A), faded burgundy (#7A2E2E), muted olive, honey-gold lamplight against deep blue dusk. Real photography, not CGI. No people, no faces, no silhouettes, no animals, no cars, no readable signs, no logos, no watermarks.
```

## 03 · We are in Paris — 8 s

*(first frame = `frames/02-LAST.png`, last frame не задавать)*

```text
One continuous take, no cuts. A slow, dreamy forward glide through an empty Paris at blue hour just after rain. 0–3 s: the camera floats down a narrow cobblestone street past empty café tables with folded chairs, wet stones mirroring the honey-coloured street lamps, a few autumn leaves turning slowly in a puddle, steam rising from a grate. 3–6 s: the street opens onto the Seine embankment; the camera rises gently over the stone parapet, the river is glassy and reflects the bridge lights, a row of bare plane trees sways, the distant Eiffel Tower glows softly in the haze. 6–8 s: the camera keeps rising toward the zinc rooftops and chimneys under a deep blue sky with the first stars, and comes to a calm, still hold. Smooth, steady motion at a constant speed, no shake, no cuts. Atmosphere only: drifting mist, falling drizzle, flickering lamps, soft reflections. Warm analog look, 35mm Kodak Portra 400 grain, soft halation, gently faded highlights, lifted blacks. Palette: ivory (#F3EDE2), terracotta (#B4664A), faded burgundy (#7A2E2E), muted olive, honey-gold lamplight against deep blue dusk. Real photography, not CGI. No people, no faces, no silhouettes, no animals, no cars, no boats with people, no readable signs, no logos, no watermarks.
```

---

## Бонус: 04 · Обратно в дневник (замыкает петлю) — 8 s

Нужен, если хочешь, чтобы в конце лендинга Париж снова стал страницей и дневник закрылся (кнопка «Open the darkroom»).
First frame = `frames/03-LAST.png`; last frame (если есть поле) = `frames/01-diary-LAST.png`.

```text
One continuous take, no cuts. Starting on calm Paris rooftops under a deep blue sky with the first stars. The camera slowly pulls back at a constant speed: 0–3 s: the edges of the view curl inward and turn into the white border of a vintage photograph, the rain and the lamps freeze into a still image. 3–6 s: the photograph is revealed taped onto the page of an open leather travel diary on a dark oak desk lit by a warm desk lamp; nearby pages are full of polaroids, pressed leaves and washi tape with unreadable handwriting. 6–8 s: the diary closes gently on its own, the burgundy elastic band slides back over the cover, dust motes float in the lamplight, calm still hold. Smooth, steady motion. Warm analog look, 35mm Kodak Portra 400 grain, soft halation, gently faded highlights, lifted blacks. Palette: ivory (#F3EDE2), terracotta (#B4664A), faded burgundy (#7A2E2E), muted olive, honey-gold lamplight. Real photography, not CGI. No people, no faces, no hands, no animals, no readable text, no logos, no watermarks.
```

---

## Если дубль плохой — что добавить в конец промта

| Проблема | Допиши |
|---|---|
| Появились люди | `The streets are completely empty. Absolutely no people or human figures anywhere in the frame.` |
| Камера дёргается / резко ускоряется | `Locked-off motion-controlled camera rig, perfectly linear speed, no acceleration.` |
| Склейка посреди клипа | `Single uninterrupted shot from the first frame to the last.` |
| Читаемые надписи | `All handwriting and signs are blurred and illegible.` |
| Слишком «CGI» | `Shot on a real film camera, practical light, natural imperfections.` |
