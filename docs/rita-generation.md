# Рита: генерация иллюстрации

Решение из `docs/HISTORY.md` (2026-10-26): Риту рисует генератор картинок по
словесному описанию, код только анимирует готовые слои. Этот файл — инструкция
для владельца: что генерировать, какими промптами, как проверить результат и
куда положить файлы.

> **Эталон внешности — выбранная картинка генератора.** Рита из пробы кодом
> (`characters/rita/rita.js`, `characters/rita/sheet.html`) — не образец и в
> ролик не попадает. Анимация двигает части самой картинки, поэтому в ролике
> Рита выглядит ровно так, как на ней.

## Правила

- **Только слова.** Фото Риты и референс стиля владельца в генератор не
  загружаем (`CLAUDE.md`, раздел «Личные данные»). Загружать можно только
  картинки, которые сам генератор уже сделал, — например, лист персонажа как
  основу для поз.
- **Генератор:** **Qwen** — в нём сделаны все принятые картинки (лист, позы
  A и B). Пробовали и Gemini (Nano Banana 2): он точнее по описанию, но
  владельцу больше нравится живая акварель Qwen. Регистрацию и оплату делает
  владелец.
- **Промпты — на английском:** генераторы понимают его точнее всего.
  Промпт копируем целиком. Описание внешности и стиля одинаковое во всех
  промптах — это помогает удержать одного и того же персонажа.
- **Перед публикацией ролика** владелец перечитывает актуальные условия
  Qwen для своего тарифа: можно ли использовать картинку в коммерческом
  видео на YouTube. Пока это не проверено.

## Что нужно получить

| # | Картинка | Где в ролике | Как делаем |
|---|---|---|---|
| 0 | Лист персонажа: Рита в полный рост, нейтральная поза, анфас и профиль | не в ролике — эталон внешности | готово: `sheet-draft-02.webp` |
| 1 | Поза A: полупрофиль вправо, в полный рост, ветер справа | сцены 1–2 | промпт 1 + эталон |
| 2 | Поза B: спиной к зрителю, на просвет рассвета | финал, 15–17,5 с | промпт 2 + эталон |
| 3 | Поза B с поворотом головы через левое плечо, профиль | финал, 17,5–20 с | правка картинки 2, промпт 3 |
| 1з, 3з | Картинки 1 и 3 с закрытыми глазами | моргание (~2,2 с и ~19 с) | правка картинок 1 и 3, промпт «моргание» |

Картинка 3 должна совпадать с картинкой 2 во всём, кроме головы и пряди у
левого плеча: в ролике голова сменяется за прядью волос на ветру. Поэтому её
делаем **правкой** картинки 2, а не новой генерацией: генератор меняет
только то, что попросили.

## Общие требования к каждой картинке

- **Фон — чистая светлая бумага без пейзажа.** Скалу, горы и солнце рисует
  код; фигуру потом вырезаем по фону, поэтому фон должен быть ровным и
  отличаться от платья. Тени на земле нет.
- **Фигура целиком, с запасом по краям.** Нужно видеть макушку, кончики волос,
  концы пояса и подол. Если генератор ставит видимый значок в углу, он не
  должен задевать фигуру.
- **Вертикальный формат 2:3**, максимальное разрешение, какое даёт тариф.
- **Без текста, подписей, печатей и рамок.**
- **Ветер дует справа** (как в раскадровке `docs/intro-01-storyboard.md`):
  волосы, подол и концы пояса отлетают влево.
- **Волосы — отдельные пряди**, сквозь которые видно фон, а не сплошная
  масса: пряди потом гнёт анимация.
- **Сплошной тонкий контур вокруг всей фигуры**, в том числе по освещённой
  стороне. Освещённое платье почти белое, как фон: без контура программа не
  поймёт, где кончается платье, и фон «протечёт» внутрь (так было на
  временной картинке). Это можно поправить вручную, но лучше не допускать.

## Как генерировать (по шагам)

Каждый промпт ниже **готов целиком**: копируй весь серый блок от первой до
последней строки и вставляй в генератор как есть. Ничего не собирать и не
заменять. Один промпт — одна картинка.

**Эталон внешности** — `characters/rita/art/sheet-draft-02.webp` (выбран
владельцем 2026-10-27 за живую акварель). Скачать: GitHub → репозиторий
`dao-to-hsk-motion` → ветка `feature/rita-probe` → этот файл → кнопка Download.

1. **Поза A.** Новый чат в генераторе → приложи эталон (скрепка) → вставь
   промпт 1 → отправь. Не нравится — «Regenerate» или новая попытка; несколько
   вариантов — нормально. Если есть выбор формата — вертикальный 2:3.
2. **Мелкие поправки** — в том же чате правкой: «Edit this image. Keep
   everything the same, but …» (например, «… make the hair darker»).
3. **Скачай оригинал** выбранного варианта (не скриншот).
4. **Поза B.** **Новый** чат (чтобы поза A не подмешивалась) → приложи эталон →
   промпт 2.
5. **Поворот головы.** В том же чате, где выбранная поза B, — промпт 3. Это
   правка картинки B, а не новая генерация.
6. **Моргание.** В чате позы A — промпт «моргание»; в чате поворота — он же.
7. Пришли все картинки сюда: я разложу их по файлам и подключу к анимации.

Проверяй каждую картинку по чек-листу ниже.

## Промпты

Тексты про внешность и стиль взяты из `docs/character-rita.md` и
`docs/brand.md`. Изменилось описание там — обнови во всех промптах здесь.

### Промпт 1 — поза A (приложить эталон)

```text
Use the attached image as the reference for this woman: the same face, hair,
body, dress, sash and the same painting style. Draw her only once, alone, in a
new pose.

POSE: full body, three-quarter view turned to the right, almost profile. She
stands still on an unseen rock and gazes far into the distance to the right.
Arms relaxed along the body. A steady gentle wind blows from the right: her
long hair streams back to the left in separate strands, the dress presses
against her front and flares behind her, the two sash ends fly to the left.
Cool soft morning light from the right.

CHARACTER: a slender young woman, about seven heads tall, slightly long arms
and neck, narrow waist. Very long straight dark chestnut-brown hair reaching
her waist, center part. Oval face, defined cheekbones, straight nose, a soft
calm half-smile. Light grey-blue eyes. Fair skin with a few faint freckles.
Calm, gentle, thoughtful; she gazes into the distance.
COSTUME: a long loose linen dress the colour of warm off-white paper, reaching
the ankles; a thin ink-drawn vine with small leaves embroidered along the hem
and the sleeve cuffs; a deep wine-red sash belt tied at the waist with two long
loose ends. Feet almost hidden by the hem. No tattoos.

STYLE: traditional ink and watercolour illustration on white cold-press paper.
Lots of untouched white paper: the lit side of the figure stays bare paper,
colour only in the shadows. Transparent layered washes with uneven edges and
darker dried-pigment rims, soft granulation. Living ink line in sepia-black
that changes thickness and breaks in places, not a clean even outline. Hair
painted as ribbon-like strands and single brush lines, not a solid mass.
Simple face without realistic detail. A few small ink and paint splatters.
Muted palette only: indigo shadows in the hair and folds, pale blue-grey cool
shadows on the dress, soft ochre warmth in the linen, sienna shadows on skin,
sepia hair, one wine-red accent (the sash). No bright or saturated colours.
Elegant and refined, not childish, not anime, not 3D, not photorealistic.

COMPOSITION: full body from the top of the head to below the hem, with wide
empty margins on all sides. A thin continuous ink outline around the whole
figure, also along the lit side, so the figure is clearly separated from the
paper. Plain flat light paper background, no landscape, no ground shadow, no
frame, no text, no signature, no seal. Vertical 2:3.
```

### Промпт 2 — поза B (приложить эталон, новый чат)

```text
Use the attached image as the reference for this woman: the same face, hair,
body, dress, sash and the same painting style. Draw her only once, alone, in a
new pose.

POSE: full body seen from directly behind. She stands still and looks ahead at
a sunrise that is in front of her (not shown). Backlit: warm rim light along
her outline and through the edges of her hair, the linen dress slightly
translucent at the edges with a soft grey-violet tint, her back in cool shadow.
Head straight, looking forward; her face is not visible. Long hair falls down
her back to the waist, a few strands lifted by a light wind from the right;
the sash ends drift gently to the left.

CHARACTER: a slender young woman, about seven heads tall, slightly long arms
and neck, narrow waist. Very long straight dark chestnut-brown hair reaching
her waist, center part. Oval face, defined cheekbones, straight nose, a soft
calm half-smile. Light grey-blue eyes. Fair skin with a few faint freckles.
Calm, gentle, thoughtful; she gazes into the distance.
COSTUME: a long loose linen dress the colour of warm off-white paper, reaching
the ankles; a thin ink-drawn vine with small leaves embroidered along the hem
and the sleeve cuffs; a deep wine-red sash belt tied at the waist with two long
loose ends. Feet almost hidden by the hem. No tattoos.

STYLE: traditional ink and watercolour illustration on white cold-press paper.
Lots of untouched white paper: the lit side of the figure stays bare paper,
colour only in the shadows. Transparent layered washes with uneven edges and
darker dried-pigment rims, soft granulation. Living ink line in sepia-black
that changes thickness and breaks in places, not a clean even outline. Hair
painted as ribbon-like strands and single brush lines, not a solid mass.
Simple face without realistic detail. A few small ink and paint splatters.
Muted palette only: indigo shadows in the hair and folds, pale blue-grey cool
shadows on the dress, soft ochre warmth in the linen, sienna shadows on skin,
sepia hair, one wine-red accent (the sash). No bright or saturated colours.
Elegant and refined, not childish, not anime, not 3D, not photorealistic.

COMPOSITION: full body from the top of the head to below the hem, with wide
empty margins on all sides. A thin continuous ink outline around the whole
figure, also along the lit side, so the figure is clearly separated from the
paper. Plain flat light paper background, no landscape, no ground shadow, no
frame, no text, no signature, no seal. Vertical 2:3.
```

### Промпт 3 — поворот головы (правка позы B, в том же чате)

```text
Edit this image. Keep everything exactly the same: body, dress, sash, light,
style, framing, size and position of the figure. Change only her head: she
turns her head to the left over her left shoulder, so we see her face in left
side profile, with a soft calm half-smile, light grey-blue eye. The hair on the
left side slides off her shoulder. Do not change anything else.
```

Сравни позу B и поворот, переключаясь между ними: плечи, пояс и подол должны
стоять на месте. Если поехали — повтори правку или проси точнее
(«the shoulders and dress must stay identical»).

### Промпт «моргание» (правка позы A и поворота, в их чатах)

```text
Edit this image. Keep everything exactly the same. Change only her eyes: they
are gently closed, relaxed eyelids, as in the middle of a blink. Do not change
anything else.
```

В ролике эта картинка показывается на пару кадров поверх основной, поэтому
всё, кроме век, должно совпасть точно.

### Промпт 0 — лист персонажа (уже сделан, для истории)

Так получен эталон. Повторять не нужно, разве что эталон придётся менять.

```text
Character reference sheet of one woman, two full-body views side by side on
the same sheet: front view and right side profile view, standing relaxed,
arms down, no wind.

CHARACTER: a slender young woman, about seven heads tall, slightly long arms
and neck, narrow waist. Very long straight dark chestnut-brown hair reaching
her waist, center part. Oval face, defined cheekbones, straight nose, a soft
calm half-smile. Light grey-blue eyes. Fair skin with a few faint freckles.
Calm, gentle, thoughtful; she gazes into the distance.
COSTUME: a long loose linen dress the colour of warm off-white paper, reaching
the ankles; a thin ink-drawn vine with small leaves embroidered along the hem
and the sleeve cuffs; a deep wine-red sash belt tied at the waist with two long
loose ends. Feet almost hidden by the hem. No tattoos.

STYLE: traditional ink and watercolour illustration on white cold-press paper.
Lots of untouched white paper: the lit side of the figure stays bare paper,
colour only in the shadows. Transparent layered washes with uneven edges and
darker dried-pigment rims, soft granulation. Living ink line in sepia-black
that changes thickness and breaks in places, not a clean even outline. Hair
painted as ribbon-like strands and single brush lines, not a solid mass.
Simple face without realistic detail. A few small ink and paint splatters.
Muted palette only: indigo shadows in the hair and folds, pale blue-grey cool
shadows on the dress, soft ochre warmth in the linen, sienna shadows on skin,
sepia hair, one wine-red accent (the sash). No bright or saturated colours.
Elegant and refined, not childish, not anime, not 3D, not photorealistic.

COMPOSITION: full body from the top of the head to below the hem, with wide
empty margins on all sides. A thin continuous ink outline around the whole
figure, also along the lit side, so the figure is clearly separated from the
paper. Plain flat light paper background, no landscape, no ground shadow, no
frame, no text, no signature, no seal. Horizontal 3:2.
```

## Чек-лист проверки результата

Внешность (`docs/character-rita.md`):
- [ ] стройная, около 7 «голов» в росте, а не модельные 8+;
- [ ] волосы прямые, тёмно-каштановые, до пояса, пробор посередине;
- [ ] лицо овальное, скулы, прямой нос, мягкая полуулыбка, серо-голубые глаза;
- [ ] веснушки только намёком;
- [ ] нет татуировок;
- [ ] это узнаваемо Рита, а не «случайная девушка» (решает владелец).

Костюм:
- [ ] льняное платье цвета бумаги до щиколоток;
- [ ] вышитая лоза тушью по подолу и рукавам;
- [ ] пояс винного цвета, два длинных конца.

Стиль (`docs/brand.md`):
- [ ] много белой бумаги, цвет только в тенях;
- [ ] живая тушевая линия, неровные края заливок;
- [ ] приглушённые цвета, яркий только пояс;
- [ ] не аниме, не 3D, не «детский рисунок».

Техника (для анимации):
- [ ] фигура целиком, края кадра не режут волосы, пояс и подол;
- [ ] ровный светлый фон без пейзажа, тени и текста;
- [ ] контур вокруг фигуры сплошной, особенно по светлой стороне платья;
- [ ] значок генератора не задевает фигуру;
- [ ] ветер справа: волосы, подол и пояс отлетают влево (позы A и B);
- [ ] пряди волос отдельные, между ними виден фон;
- [ ] руки: правильное число пальцев, нет лишних конечностей;
- [ ] картинки 2 и 3 совпадают во всём, кроме головы и пряди у плеча;
- [ ] картинки 1з и 3з отличаются от 1 и 3 только веками.

## Куда класть файлы

| Что | Куда | В git? |
|---|---|---|
| Черновики, все попытки | `out/rita-drafts/` | нет (`out/` в `.gitignore`) |
| Выбранные картинки 0–3 | `characters/rita/art/` под именами `sheet.png`, `pose-a.png`, `pose-a-blink.png`, `pose-b.png`, `pose-b-turn.png`, `pose-b-turn-blink.png` | да |
| Откуда взялась каждая картинка | `characters/rita/art/SOURCES.md` | да |

В `SOURCES.md` для каждой картинки: файл, генератор и модель, тариф, дата,
промпт (или ссылка на раздел этого файла), какая картинка была основой. Так же,
как для музыки в `music/CREDITS.md`: через полгода будет понятно, откуда
картинка и на каких условиях её можно использовать.

Скачивай оригинал в максимальном качестве, а не скриншот.

## Что дальше

Механизм анимации уже готов и проверен на временной картинке
(`shared/rig.js`, проба `videos/probe-rig/`, см. README). Когда картинки 1–3
(и 1з, 3з) лежат в `characters/rita/art/`, Claude:

1. делает для них файл настроек по образцу `characters/rita/rig-placeholder.js`:
   обводит области волос, пояса, подола, глаз и головы (свободные пряди —
   ещё и как `soft`: их вырезка идёт по плотности краски);
2. проверяет вырезку и области в режиме `?debug`, подбирает силу ветра;
3. показывает кадры и короткое превью.
