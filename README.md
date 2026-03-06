# Where in the World? 🌍

A browser-based geography quiz game. Each round shows a cultural image and players guess which country it's from — then an animated 3D globe flies to the answer and reveals a fun fact.

Built with [globe.gl](https://globe.gl/), Three.js, GSAP, and Vite.

## Features

- 10 rounds across 10 countries
- Animated 3D globe that flies to each country on reveal
- Country highlight on the globe
- Fun fact for every round
- Keyboard-friendly (Enter to advance)

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/Daksh-T/where_in_the_world.git
cd where_in_the_world
npm install
```

### 2. Add images

Images are **not included** in this repo. You need to supply your own — one per round.

Place them in `public/images/` with these filenames:

| File | Country |
|------|---------|
| `round1.jpg` | Japan |
| `round2.jpg` | Mexico |
| `round3.jpg` | India |
| `round4.jpg` | Egypt |
| `round5.jpg` | Brazil |
| `round6.jpg` | Italy |
| `round7.jpg` | Australia |
| `round8.jpg` | Morocco |
| `round9.jpeg` | Peru |
| `round10.jpg` | South Korea |

See [`IMAGE_GUIDE.md`](IMAGE_GUIDE.md) for suggestions on what images work well for each country.

### 3. Run

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Customising Rounds

Edit `src/gameData.js` to change any round's country, image, fun fact, globe coordinates, or highlight colour.

## Build for Production

```bash
npm run build
```

Output goes to `dist/`.

## License

MIT
