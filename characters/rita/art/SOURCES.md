# Откуда картинки Риты

Правила и промпты — `docs/rita-generation.md`. Для каждой картинки: файл,
генератор и модель, тариф, дата, промпт, основа.

**Эталон внешности для поз — `sheet-draft-02.webp`** (выбор владельца 2026-10-27:
живая акварель Qwen понравилась больше аккуратного варианта Gemini Nano Banana 2).

Черновики (`*-draft-*`) — не финальные: хранятся, чтобы видеть, как менялся
образ. Финальные картинки получат имена из `docs/rita-generation.md`
(`sheet.png`, `pose-a.png` и т. д.).

| Файл | Что | Генератор, тариф | Дата | Промпт | Основа |
|---|---|---|---|---|---|
| `sheet-draft-01.webp` | Лист персонажа, первая генерация: анфас и профиль вправо, 2000×1116 | Qwen (тариф уточнить) | 2026-10-26 | промпт 0 (точный текст — уточнить) | — |
| **`sheet-draft-02.webp`** | **Эталон внешности.** Лист, правка первой: тёмно-каштановые волосы, пробор, взрослее, обувь под подолом | Qwen | 2026-10-26 | правка: «make her hair dark chestnut-brown, with a clear center part; make her look like an adult woman with more defined cheekbones; the hem should hide her shoes» (точный текст — уточнить) | `sheet-draft-01.webp` |
| `pose-a-draft-01.webp` | Поза A, первая генерация: камень под ногами, рамка по краю, 2000×1116 | Qwen | 2026-10-27 | промпт 1 из `docs/rita-generation.md` | `sheet-draft-02.webp` |
| **`pose-a.webp`** | **Итоговая поза A**: правка первой — без камня и рамки, обувь скрыта подолом, 2000×1116 | Qwen | 2026-10-27 | правка: «Edit this image. Keep her exactly the same. Remove the rock under her feet and the thin border frame around the picture. Extend the plain paper background below her so there is empty space under the hem. Do not change anything else.» | `pose-a-draft-01.webp` |
| **`pose-b.webp`** | **Итоговая поза B**: спиной, на просвет, 2000×1116 | Qwen | 2026-10-27 | промпт 2 из `docs/rita-generation.md` | `sheet-draft-02.webp` |
| **`pose-b-turn.webp`** | **Поворот головы** через левое плечо, вполоборота (не строгий профиль); концы пояса сдвинуты относительно `pose-b` | Qwen | 2026-10-27 | промпт 3 из `docs/rita-generation.md` (правка) | `pose-b.webp` |

Отдельно пробовали Gemini (Nano Banana 2): аккуратный лист, точный по
описанию, — не принят по стилю, в репозиторий не положен.
