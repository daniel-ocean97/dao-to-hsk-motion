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
- **Генератор:** основной — **Gemini** (приложение Gemini, модель Nano Banana).
  Запасной — Midjourney. Регистрацию и оплату делает владелец.
- **Промпты — на английском:** генераторы понимают его точнее всего.
  Промпт копируем целиком: блоки «Персонаж» и «Стиль» одинаковые во всех
  запросах, это помогает удержать одного и того же персонажа.
- **Перед публикацией ролика** владелец перечитывает актуальные условия
  Google для своего тарифа: можно ли использовать картинку в коммерческом
  видео на YouTube. Пока это не проверено.

## Что нужно получить

| # | Картинка | Где в ролике | Как делаем |
|---|---|---|---|
| 0 | Лист персонажа: Рита в полный рост, нейтральная поза, анфас и профиль | не в ролике — эталон внешности | с нуля, промпт 0 |
| 1 | Поза A: полупрофиль вправо, в полный рост, ветер справа | сцены 1–2 | промпт 1 + картинка 0 как основа |
| 2 | Поза B: спиной к зрителю, на просвет рассвета | финал, 15–17,5 с | промпт 2 + картинка 0 |
| 3 | Поза B с поворотом головы через левое плечо, профиль | финал, 17,5–20 с | правка картинки 2, промпт 3 |
| 1з, 3з | Картинки 1 и 3 с закрытыми глазами | моргание (~2,2 с и ~19 с) | правка картинок 1 и 3, промпт «моргание» |

Картинка 3 должна совпадать с картинкой 2 во всём, кроме головы и пряди у
левого плеча: в ролике голова сменяется за прядью волос на ветру. Поэтому её
делаем **правкой** картинки 2, а не новой генерацией. Правка по картинке —
сильная сторона Gemini.

## Общие требования к каждой картинке

- **Фон — чистая светлая бумага без пейзажа.** Скалу, горы и солнце рисует
  код; фигуру потом вырезаем по фону, поэтому фон должен быть ровным и
  отличаться от платья. Тени на земле нет.
- **Фигура целиком, с запасом по краям.** Нужно видеть макушку, кончики волос,
  концы пояса и подол. У бесплатного Gemini в углу стоит видимый значок —
  он не должен задевать фигуру.
- **Вертикальный формат 2:3**, максимальное разрешение, какое даёт тариф.
- **Без текста, подписей, печатей и рамок.**
- **Ветер дует справа** (как в раскадровке `docs/intro-01-storyboard.md`):
  волосы, подол и концы пояса отлетают влево.
- **Волосы — отдельные пряди**, сквозь которые видно фон, а не сплошная
  масса: пряди потом гнёт анимация.

## Промпты

Блоки ниже собраны из `docs/character-rita.md` (внешность и костюм) и
`docs/brand.md` (стиль акварели). Изменилось описание там — обнови здесь.

### Блок «Персонаж» (вставляется во все промпты)

```text
CHARACTER: a slender young woman, about seven heads tall, slightly long arms
and neck, narrow waist. Very long straight dark chestnut-brown hair reaching
her waist, center part. Oval face, defined cheekbones, straight nose, a soft
calm half-smile. Light grey-blue eyes. Fair skin with a few faint freckles.
Calm, gentle, thoughtful; she gazes into the distance.
COSTUME: a long loose linen dress the colour of warm off-white paper, reaching
the ankles; a thin ink-drawn vine with small leaves embroidered along the hem
and the sleeve cuffs; a deep wine-red sash belt tied at the waist with two long
loose ends. Feet almost hidden by the hem. No tattoos.
```

### Блок «Стиль» (вставляется во все промпты)

```text
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
```

### Блок «Требования» (вставляется во все промпты, кроме правки)

```text
COMPOSITION: full body from the top of the head to below the hem, with wide
empty margins on all sides. Plain flat light paper background, no landscape,
no ground shadow, no frame, no text, no signature, no seal. Vertical 2:3.
```

### Промпт 0 — лист персонажа

```text
Character reference sheet of one woman, two full-body views side by side on
the same sheet: front view and right side profile view, standing relaxed,
arms down, no wind.

[CHARACTER]
[STYLE]
[COMPOSITION, но вместо «Vertical 2:3» — «Horizontal 3:2»]
```

Сгенерируй несколько вариантов и выбери тот, где Рита больше всего похожа на
себя и стиль ближе всего к нужному. Если лицо не нравится, проси правку той же
картинки («make the face softer, keep everything else the same»), а не новую
генерацию: так сохраняется остальное.

### Промпт 1 — поза A

Приложи выбранный лист (картинку 0) и напиши:

```text
Use the attached reference sheet for her face, hair, body and costume; keep
the same woman and the same painting style.

POSE: full body, three-quarter view turned to the right, almost profile. She
stands still on an unseen rock and gazes far into the distance to the right.
Arms relaxed along the body. A steady gentle wind blows from the right: her
long hair streams back to the left in separate strands, the dress presses
against her front and flares behind her, the two sash ends fly to the left.
Cool soft morning light from the right.

[CHARACTER]
[STYLE]
[COMPOSITION]
```

### Промпт 2 — поза B

Приложи картинку 0 и напиши:

```text
Use the attached reference sheet for her hair, body and costume; keep the same
woman and the same painting style.

POSE: full body seen from directly behind. She stands still and looks ahead at
a sunrise that is in front of her (not shown). Backlit: warm rim light along
her outline and through the edges of her hair, the linen dress slightly
translucent at the edges with a soft grey-violet tint, her back in cool shadow.
Head straight, looking forward; her face is not visible. Long hair falls down
her back to the waist, a few strands lifted by a light wind from the right;
the sash ends drift gently to the left.

[CHARACTER]
[STYLE]
[COMPOSITION]
```

### Промпт 3 — поворот головы (правка картинки 2)

Открой выбранную картинку 2 и напиши правку:

```text
Edit this image. Keep everything exactly the same: body, dress, sash, light,
style, framing, size and position of the figure. Change only her head: she
turns her head to the left over her left shoulder, so we see her face in left
side profile, with a soft calm half-smile, light grey-blue eye. The hair on the
left side slides off her shoulder. Do not change anything else.
```

Сравни картинки 2 и 3, переключаясь между ними: плечи, пояс и подол должны
стоять на месте. Если поехали — повтори правку или проси точнее
(«the shoulders and dress must stay identical»).

### Промпт «моргание» (правка картинок 1 и 3)

Открой картинку 1 (потом так же картинку 3) и напиши правку:

```text
Edit this image. Keep everything exactly the same. Change only her eyes: they
are gently closed, relaxed eyelids, as in the middle of a blink. Do not change
anything else.
```

В ролике эта картинка показывается на пару кадров поверх основной, поэтому
всё, кроме век, должно совпасть точно.

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

Когда картинки 1–3 (и 1з, 3з) лежат в `characters/rita/art/`, Claude:

1. вырезает фигуру из фона и делит её на слои: тело, волосы, подол, концы пояса;
2. делает анимацию слоёв: деформация сеткой для прядей, подола и пояса,
   дыхание, моргание; смена головы в финале прячется за прядью на ветру;
3. показывает кадры и короткое превью.

Пока картинок нет, механизм анимации проверяем на временной картинке.
