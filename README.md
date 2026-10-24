# Super Rally

A retro arcade racing game built with **React, TypeScript, Tailwind CSS, and Phaser 3**. Pick a rally-inspired car, race seven rivals, and chase the horizon as daylight fades into an OutRun-inspired sunset.

The game uses Phaser's 2D graphics to draw a road in perspective, giving it the feel of a classic chase-camera racer. Cars, scenery, and the sunset are drawn procedurally.

## Getting started

You need **Node.js 20.19 or newer** and **npm** installed.

From the project folder:

```sh
npm install
npm run dev
```

Open the local URL printed in your terminal. Keep the terminal running while you play.

To use the same address as the existing preview:

```sh
npm run dev -- --port 5186 --strictPort
```

Then open [http://localhost:5186](http://localhost:5186).

The game runs in the browser. No backend, account, API keys, or environment variables are required.

## How to play

Choose a car and circuit, then press **Let's go racing** or **Enter** to start.

Finish **three laps** before the countdown reaches zero. You start with **90 seconds** and receive **25 bonus seconds** when you complete the first and second laps. Race against seven opponents for the best finishing position.

Stay on the asphalt: driving off-road reduces your speed, and hitting another car slows you down. Use the handbrake to turn more sharply through corners, at the cost of some speed.

Your chosen car and best completed race time for each circuit are saved in your browser's local storage.

### Controls

| Action                           | Keyboard               |
| -------------------------------- | ---------------------- |
| Accelerate                       | **W** or **↑**         |
| Brake                            | **S** or **↓**         |
| Steer                            | **A / D** or **← / →** |
| Handbrake and drift              | **Space**              |
| Start from the garage            | **Enter**              |
| Pause or resume                  | **Escape**             |
| Restart and return to the garage | **R**                  |

Touch controls appear on small screens. The toolbar also provides restart, pause, engine sound, and control-help buttons.

## The garage

Four cars offer different looks, acceleration, steering response, and top speed. Their handling is tuned for arcade play.

| Car inspiration       | Livery           | Driving style                                         |
| --------------------- | ---------------- | ----------------------------------------------------- |
| Subaru Impreza        | Blue & Gold      | Balanced handling and acceleration                    |
| Mitsubishi Lancer Evo | Scarlet Attack   | Quick acceleration and sharp steering                 |
| Lancia Delta          | Box-Fresh Legend | Nimble hatchback with the strongest steering response |
| Toyota Celica         | Turbo Horizon    | Higher top speed with gentler acceleration            |

**Change car** opens a dedicated picker. During a race, opening it pauses the action. Cancelling keeps your current car and resumes a race that was running; confirming applies the new car and returns you to the start of a fresh race.

## Circuits

- **Sunset Speedway** — a coastal circuit with gentler bends.
- **Neon Coast** — an ocean highway with more demanding corners.
- **Alpine Thunder** — a mountain pass with the strongest curves and pine scenery.

Select a circuit from the sidebar. Changing circuits starts a fresh race.

## Daylight and sunset

Every race begins in daylight. After **30 seconds of actual movement**, the scenery gradually transitions into sunset over **20 seconds**.

The sun lowers, grows, and develops horizontal stripes. The sky turns pink and orange, the mountains become purple, and the road, ocean, and trees change colour with the light.

Menus, pauses, and sitting still do not advance the daylight clock. Restarting, changing circuit, or confirming a car change restores daylight.

To adjust the timing, edit `src/daylight.ts`:

```ts
export const SUNSET_START_SECONDS = 30;
export const SUNSET_FADE_SECONDS = 20;
```

## Music and sound

The **Arcade Radio** bar beneath the game has a **Music on/off** button. Music starts off and begins after you click the button. The soundtrack loops at 30% volume and continues across car and circuit changes.

Engine sound has its own speaker button in the toolbar. It is synthesized using the Web Audio API.

### Soundtrack credit

**Hot Roadway (BPM 160)** by **MintoDog**, released under **CC0 1.0 Universal**.

- [Original track on OpenGameArt](https://opengameart.org/content/hot-roadway)
- [CC0 licence](https://creativecommons.org/publicdomain/zero/1.0/)
- [Download and conversion details](public/audio/CREDITS.md)

The music is bundled locally in AAC/M4A and OGG formats.

## Development commands

| Command                | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Start the Vite development server                        |
| `npm run build`        | Check TypeScript and build production files into `dist/` |
| `npm run preview`      | Serve the production build locally                       |
| `npm test`             | Run daylight timing, movement, pause, and restart tests  |
| `npm run format`       | Format the project with Prettier                         |
| `npm run format:check` | Check formatting without changing files                  |

To preview a production build:

```sh
npm run build
npm run preview
```

Prettier ignores dependencies, build output, the package lockfile, and TypeScript build metadata.

## Project structure

```text
src/
  main.tsx          React interface, garage, race HUD, and controls
  game.ts           Phaser scene, perspective rendering, driving, and opponents
  vehicles.ts       Car definitions, handling values, and saved selection
  daylight.ts       Sunset timing and transition progress
  MusicPlayer.tsx   Looping soundtrack and music toggle
  style.css         Tailwind import and responsive styles
public/
  audio/            Music files and credits
tests/
  daylight.test.cjs Scene update-loop and sunset timing tests
index.html          HTML entry point
vite.config.ts      Vite, React, and Tailwind configuration
```

## Troubleshooting

**The app is not running:** start the development server again with `npm run dev -- --port 5186 --strictPort`, then refresh the browser. The local preview stops when its server process ends.

**Port 5186 is already in use:** use the existing server or choose another port, for example `npm run dev -- --port 5187`.

**Music is silent:** click **Music on**, check your device volume and browser tab mute setting, and retry if the player shows an error.

**Saved car or best times have disappeared:** these settings belong to the current browser and site address. Clearing site storage, switching browsers, or changing the port can give you a different set of saved settings.
