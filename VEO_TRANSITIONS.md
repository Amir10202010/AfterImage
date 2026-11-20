# Veo 3.1 Lite: переделать низ лендинга (чернила → свет)

> **Это не про Париж.** Здесь только два старых фоновых видео в самом низу лендинга: под «Nothing leaves your device»
> (чаша с чернилами) и под «Someone has been waiting for you» (тёплый свет). Цепочка дневник → Париж — в `VEO_PARIS.md`,
> там `ink-LOOP.png` и `leak-LOOP.png` не используются. Если низ лендинга тоже станет Парижем, этот файл можно не делать.

## Что сейчас не так

| Клип | Проблема |
|---|---|
| `ink.mp4` (фон «Nothing leaves your device») | Это не цикл, а одноразовая сцена: чистая белая чаша → капля → всё чёрное. При повторе картинка **прыгает с чёрной на белую** каждые 4 с. |
| `ink-to-leak.mp4` (мост) | В середине превращается в **тусклую коричневую плёнку с рамкой кадра**, «вау» нет. Конец (тёмный, с рамкой) не совпадает с началом `leak.mp4`. |
| `leak.mp4` (фон финала) | Тоже не цикл: тёмный → яркий → почти белый. При повторе **прыгает с белого на тёмный**. |

## Что сделать: 3 новых клипа

Все кадры уже лежат в `frames/`. Чтобы склеек не было видно вообще, цепочка такая:

```
ink-loop.mp4        первый = последний = frames/ink-LOOP.png      (бесшовный цикл)
ink-to-leak.mp4     первый = frames/ink-LOOP.png → последний = frames/leak-LOOP.png
leak-loop.mp4       первый = последний = frames/leak-LOOP.png     (бесшовный цикл)
```

Сайт сам переходит между ними по скроллу, а мост перематывается скроллом. Если начало и конец каждого клипа совпадают с соседями,
момент смены клипа невидим.

**Настройки:** 16:9, 8 s, 1080p, звук не нужен. Режим **frames to video** (первый + последний кадр).
Если поля «последний кадр» нет, сгенерируй только с первым кадром и скажи мне: я сделаю цикл в коде (сведу конец с началом
кроссфейдом и проиграю туда-обратно). Так тоже будет гладко, просто чуть менее чисто.

**Какой дубль брать:** камера **неподвижна** (в циклах) или движется ровно (в мосту); **без склеек**; без рамки плёнки, без
царапин и меток кадра; цвета не скачут к концу.

Пришли мне три файла: я перекодирую мост так, чтобы каждый кадр был ключевым (иначе скролл-перемотка дёргается), и подставлю их на сайт.

---

## A · `ink-loop.mp4` — бесшовный цикл чернил

**First frame:** `frames/ink-LOOP.png` · **Last frame:** `frames/ink-LOOP.png`

```text
Seamless looping shot, locked-off static camera, no cuts. Macro view of a white porcelain bowl filled with still water, seen from slightly above. Dense black-burgundy ink clouds bloom and curl slowly under the surface, fine silky tendrils unfurling and drifting in slow motion, soft swirling eddies, delicate translucent veils of ink spreading toward the rim. The motion is calm, hypnotic and continuous, like breathing; the ink keeps turning gently in place and returns to exactly the same arrangement at the end as at the beginning. Soft diffused warm daylight from the upper left, subtle reflections on the porcelain rim, a few tiny air bubbles. Ink colour deep burgundy almost black (#3B1414 to #7A2E2E) against ivory porcelain (#F3EDE2). 35mm Kodak Portra 400 look, fine grain, gently faded highlights, lifted blacks. Real macro photography, not CGI. No hands, no people, no new drops falling, no film frame border, no scratches, no text, no logos, no watermarks.
```

## B · `ink-to-leak.mp4` — чернила становятся светом (мост, крутится скроллом)

**First frame:** `frames/ink-LOOP.png` · **Last frame:** `frames/leak-LOOP.png`

```text
One continuous take, no cuts, slow steady push-in at a constant speed. Starting on dense black-burgundy ink clouds swirling in a white porcelain bowl of water. 0–2 s: a warm glow appears deep beneath the ink, as if a lamp were switched on under the bowl; the darkest folds of ink start to shine from inside with amber and terracotta light. 2–5 s: the camera sinks into the ink as the porcelain rim drifts out of frame; every tendril catches fire with warm light, the black turns into glowing burgundy, then copper, then honey-orange, the water itself becomes luminous. 5–8 s: we are fully inside a sea of flowing, glowing orange and cream smoke-like light, soft and silky, swirling slowly from left to right, exactly like warm light leaking onto film. The whole transformation is smooth and continuous, every shape grows out of the previous one, nothing pops in. Palette moves from ivory and burgundy (#F3EDE2, #7A2E2E) to terracotta, amber and honey-cream (#B4664A, #E8A35F, #F6E3C4). 35mm Kodak Portra 400 look, soft halation, fine grain. Real photography and practical light, not CGI. No film frame border, no sprocket holes, no scratches, no flashes, no hands, no people, no text, no logos, no watermarks.
```

## C · `leak-loop.mp4` — бесшовный цикл света

**First frame:** `frames/leak-LOOP.png` · **Last frame:** `frames/leak-LOOP.png`

```text
Seamless looping shot, locked-off static camera, no cuts. A full frame of flowing, glowing warm light like liquid smoke or a film light leak: silky bands of honey-orange, cream and terracotta curling slowly from left to right, soft darker burgundy folds between them. The motion is calm, slow and continuous, the light breathes gently brighter and dimmer, and at the end the shapes return to exactly the same arrangement as at the beginning. Palette: terracotta (#B4664A), amber (#E8A35F), honey-cream (#F6E3C4), deep burgundy shadows (#4A1820). 35mm Kodak Portra 400 look, soft halation, fine grain, gently faded highlights. Real practical light photography, not CGI. No film frame border, no sprocket holes, no scratches, no sudden flashes, no white-out, no hands, no people, no text, no logos, no watermarks.
```

---

## Нужно ли ещё одно видео?

Необязательно, но даст настоящий «вау» на входе в эту секцию:

### D · `thread-to-bowl.mp4` — нитка с лендинга падает каплей в чашу

Сейчас светлая бумага с бордовой ниткой просто растворяется в видео с чашей (градиентом). С этим клипом нитка буквально
стекает в воду. **First frame:** не нужен (text-to-video) · **Last frame:** `frames/ink-LOOP.png`

```text
One continuous take, no cuts, slow steady downward camera tilt at a constant speed. Macro tabletop shot of a sheet of smooth ivory cotton paper (#F3EDE2) with a single glossy, three-dimensional thread of wet burgundy ink (#7A2E2E) running down it like a living liquid line with real surface tension. 0–3 s: the thread flows to the bottom edge of the paper, gathers into a heavy round drop, hangs for a moment, trembles and falls. 3–5 s: the camera follows the drop down past the paper edge into a white porcelain bowl of still water; the drop hits the surface with a tiny crown splash and concentric ripples. 5–8 s: the ink blooms under the water into dense black-burgundy clouds and silky tendrils that spread and curl in slow motion, settling into a calm swirling arrangement. Soft warm diffused daylight. 35mm Kodak Portra 400 look, fine grain, gently faded highlights, lifted blacks. Real macro photography, not CGI. No hands, no people, no text, no logos, no watermarks, no film frame border.
```

Если сделаешь его, я поставлю его на скролл (как мост): нитка доходит до низа зоны, а дальше уже видео продолжает её движение в чашу.

---

## Дневник → Париж (продолжение)

Первый клип ты уже сделал: `veo/01-diary.mp4`. Его последний кадр для следующего клипа: **`frames/01-diary-LAST.png`**.
Промты 02, 03 и бонус 04 лежат в `VEO_PARIS.md`. После каждого клипа я (или ты) вытаскиваю последний кадр:

```bash
ffmpeg -sseof -0.3 -i veo/02.mp4 -an -update 1 frames/02-LAST.png
```
