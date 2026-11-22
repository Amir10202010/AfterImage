# Библиотеки, API и ИИ

## Библиотеки (package.json)

| Что | Зачем |
|---|---|
| React 19, React DOM | Интерфейс |
| TypeScript 7 | Типы |
| Vite 8 + @vitejs/plugin-react | Сборка и dev-сервер. Там же локально работает обработчик `api/imagine.ts` |
| Vitest 5 | Тесты (`npm test`) |
| oxlint | Линтер (`npm run lint`) |
| @google/genai | Клиент Gemini для игры «The Stranger» (ключ пользователя, BYOK) |

Других runtime-зависимостей нет. ZIP (чтение и запись), EXIF, анализ звука, синтез звука и отрисовка открытки написаны в проекте сами, на API браузера.

## API браузера (работают без ключей и без сети)

| API | Где используется |
|---|---|
| IndexedDB | Всё хранится на устройстве: дни, фото, письма (`src/lib/db.ts`, `store.ts`) |
| Web Audio | Живой саундскейп в темпе песни (`sound.ts`). Измерение bpm и энергии своего аудиофайла (`audio.ts`): файл декодируется локально и не загружается |
| Web Speech API (`speechSynthesis`) | Чтение дня вслух голосами самого устройства (`narration.ts`, `ReadAloud.tsx`) |
| Canvas 2D | Открытка дня в PNG для папки (`cardImage.ts`). Палитра из фото (`colors.ts`) |
| Compression Streams (`DecompressionStream`) | Чтение ZIP экспорта Instagram (`zip.ts`). Запись ZIP папки дня обходится без сжатия |
| CSS container queries, `prefers-reduced-motion` | Открытка масштабируется как единое целое. Без анимаций, если пользователь их отключил |

## Внешние сервисы (необязательные, настраиваются через env, у каждого есть запасной режим)

| Сервис | Для чего | Настройка | Без него |
|---|---|---|---|
| Google Gemini (`gemini-2.5-flash`, `gemini-2.5-flash-lite`) | `api/imagine.ts`: превращает текст дня в описание сцены для картинки | `GEMINI_API_KEYS`, `GEMINI_MODEL` в `.env` / Vercel | Картинка не рисуется, день сохраняется с фото пользователя |
| Pollinations (`zimage`) | `api/imagine.ts`: рисует картинку по описанию. `scripts/gen_photos.py`: сгенерировал демо-фотографии | `POLLINATIONS_API_KEY`, `POLLINATIONS_MODEL` | То же |
| Google Gemini (`gemini-3.5-flash-lite`, запасная `gemini-3.6-flash`) | Игра «The Stranger»: пишет фрагмент в стиле пользователя | Ключ пользователя в настройках игры (localStorage) | Игра просит ключ, остальное приложение работает |

Ключи никогда не попадают в бандл (без префикса `VITE_`), в URL и в бэкапы. Пример конфигурации — `.env.example`.

## ИИ при подготовке материалов

| Что | Чем |
|---|---|
| Видео на лендинге (`public/media/`) | Veo 3.1, промпты в `VEO_PROMPTS.md` |
| Демо-фотографии (`public/demo/`) | Pollinations по промптам из `PHOTO_PROMPTS.json` (`scripts/gen_photos.py`) |
| Часть кода и документации | Claude Code (Anthropic), под контролем команды |

## Что сделано правилами, а не ИИ

Выбор техники, палитра, ритм, голос, название папки и цитата на открытке считаются детерминированными правилами (`atmosphere.ts`, `daycard.ts`, `narration.ts`). Один и тот же день всегда даёт одну и ту же открытку, и каждое решение видно в панели «Why it looks like this».
