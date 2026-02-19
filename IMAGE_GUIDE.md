# Image Guide — Where in the World?

Place your images in the `public/images/` folder with the exact filenames listed below.

## Supported formats
- `.jpg` / `.jpeg` (recommended)
- `.png`
- `.webp`

> **Note:** The filenames in `gameData.js` use `.jpg` — if you use a different extension, update the `imageFile` field in `src/gameData.js` accordingly.

## Recommended resolution
- **1920×1080** (Full HD) or **1280×720** (HD) — landscape orientation works best
- The image will be cropped to 16:9 aspect ratio

---

## What makes a good image?

Pick images that are visually distinctive and culturally recognisable without being too obvious — the goal is to give players a fair but challenging clue.

Good options include:
- Iconic landmarks or natural landscapes
- Traditional festivals, ceremonies, or performances
- Local food, markets, or everyday street scenes
- Traditional clothing, art, or architecture

Avoid images that show text, flags, or other direct giveaways unless that's intentional.

---

## Required files

| File | Round |
|------|-------|
| `public/images/round1.jpg` | Round 1 |
| `public/images/round2.jpg` | Round 2 |
| `public/images/round3.jpg` | Round 3 |
| `public/images/round4.jpg` | Round 4 |
| `public/images/round5.jpg` | Round 5 |
| `public/images/round6.jpg` | Round 6 |
| `public/images/round7.jpg` | Round 7 |
| `public/images/round8.jpg` | Round 8 |
| `public/images/round9.jpeg` | Round 9 |
| `public/images/round10.jpg` | Round 10 |

---

## Changing the order or countries

Edit `src/gameData.js` to change any round's:
- `imageFile` — path to your image
- `countryName` — displayed on the reveal card
- `flagEmoji` — flag emoji shown on reveal
- `isoCode` — ISO 3166-1 alpha-3 code for globe highlighting (e.g. `"JPN"`, `"FRA"`)
- `targetLat` / `targetLng` — where the globe flies to
- `funFact` — the fun fact shown after reveal
