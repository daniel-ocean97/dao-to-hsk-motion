# Шрифты

Шрифты бренда (`docs/brand.md`) лежат здесь, чтобы кадр не зависел от интернета.
Подключает их `shared/caption.js`.

| Файл | Шрифт | Автор | Источник | Лицензия | Дата |
|---|---|---|---|---|---|
| `NotoSerifSC-subset.ttf` | Noto Serif SC (только знаки из роликов) | Google, Adobe | [google/fonts](https://github.com/google/fonts/tree/main/ofl/notoserifsc) | SIL OFL 1.1, `OFL-NotoSerifSC.txt` | 2026-10-27 |
| `CormorantGaramond.ttf`, `CormorantGaramond-Italic.ttf` | Cormorant Garamond | Christian Thalmann (Catharsis Fonts) | [google/fonts](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) | SIL OFL 1.1, `OFL-CormorantGaramond.txt` | 2026-10-27 |

OFL разрешает коммерческое использование, в том числе в видео на YouTube, и
распространение вместе с проектом.

Полный Noto Serif SC весит 25 МБ, поэтому в репозитории только нужные знаки.
Добавил в сцену новый иероглиф — пересобери шрифт и закоммить его:

```bash
uv run render/subset_fonts.py
```

Скрипт сам найдёт иероглифы в `videos/` и `shared/`, скачает полный шрифт в
`out/fonts-src/` (сверит SHA-256) и вырежет их утилитой fonttools через `uvx`.
