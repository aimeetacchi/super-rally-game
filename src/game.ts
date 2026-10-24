import Phaser from 'phaser';
import { sunsetProgress } from './daylight';
import { vehicles, type RallyVehicle } from './vehicles';

export type Telemetry = {
  speed: number;
  time: number;
  lap: number;
  best: number | null;
  surface: string;
  progress: number;
  position: number;
  remaining: number;
  finished: boolean;
  sunset: number;
};
export type GameCommand = 'start' | 'pause' | 'reset' | 'sound';
export const stages = [
  {
    name: 'Sunset Speedway',
    region: 'COASTAL CIRCUIT',
    length: '4.8',
    surface: 'Asphalt',
    difficulty: 'Beginner',
    points: [
      [770, 760],
      [420, 780],
      [220, 600],
      [260, 300],
      [510, 170],
      [930, 170],
      [1210, 320],
      [1220, 610],
      [1020, 780],
    ],
  },
  {
    name: 'Neon Coast',
    region: 'OCEAN HIGHWAY',
    length: '4.8',
    surface: 'Asphalt',
    difficulty: 'Intermediate',
    points: [
      [770, 760],
      [460, 770],
      [230, 610],
      [240, 350],
      [460, 170],
      [750, 300],
      [1050, 190],
      [1230, 390],
      [1200, 650],
      [980, 780],
    ],
  },
  {
    name: 'Alpine Thunder',
    region: 'MOUNTAIN PASS',
    length: '4.8',
    surface: 'Asphalt',
    difficulty: 'Expert',
    points: [
      [770, 760],
      [490, 785],
      [240, 670],
      [210, 460],
      [410, 420],
      [300, 220],
      [510, 140],
      [720, 300],
      [920, 160],
      [1200, 200],
      [1240, 420],
      [1040, 470],
      [1210, 690],
      [960, 790],
    ],
  },
];
const SEGMENT = 200,
  COUNT = 1200,
  LENGTH = COUNT * SEGMENT,
  MAX_SPEED = 12000;
type Rival = { z: number; x: number; speed: number; color: number; distance: number };
type Projection = { x: number; y: number; w: number; scale: number };
export class RallyScene extends Phaser.Scene {
  private drivingSeconds = 0;
  private vehicle: RallyVehicle = vehicles[0];
  private g!: Phaser.GameObjects.Graphics;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private active = false;
  private paused = false;
  private elapsed = 0;
  private distance = 0;
  private speed = 0;
  private playerX = 0;
  private steering = 0;
  private drift = false;
  private best: number | null = null;
  private remaining = 90;
  private lap = 1;
  private finished = false;
  private hitCooldown = 0;
  private rivals: Rival[] = [];
  private muted = true;
  private audio?: AudioContext;
  private oscillator?: OscillatorNode;
  private gain?: GainNode;
  private touch = new Set<string>();
  private reportAt = 0;
  constructor(
    private stage: number,
    private report: (data: Telemetry) => void,
    private onFinish: () => void,
  ) {
    super('rally');
  }
  create() {
    this.g = this.add.graphics();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    this.resetRivals();
    try {
      const saved = Number(localStorage.getItem('arcade-best-' + this.stage));
      this.best = saved > 0 && Number.isFinite(saved) ? saved : null;
    } catch {
      /* Storage is optional. */
    }
    this.events.once('shutdown', () => void this.audio?.close());
    this.draw();
    this.emit();
  }
  setVehicle(vehicle: RallyVehicle) {
    if (this.active) return;
    this.vehicle = vehicle;
    if (this.g) this.draw();
  }
  private resetRivals() {
    this.rivals = Array.from({ length: 7 }, (_, i) => ({
      z: 4200 + i * 6500,
      x: [-0.65, 0, 0.65][i % 3],
      speed: 7600 + i * 170,
      color: [0x29d6f0, 0xffc527, 0xbb68ef, 0x35db81, 0xf8f3e2, 0xff8536, 0x4885ff][i],
      distance: 4200 + i * 6500,
    }));
  }
  private curve(index: number) {
    const t = ((index % COUNT) / COUNT) * Math.PI * 2;
    return (Math.sin(t * 2) * 0.9 + Math.sin(t * 5) * 0.24) * [0.7, 1, 1.4][this.stage];
  }
  private quad(
    color: number,
    x1: number,
    y1: number,
    w1: number,
    x2: number,
    y2: number,
    w2: number,
  ) {
    this.g.fillStyle(color);
    this.g.fillPoints(
      [
        { x: x1 - w1, y: y1 },
        { x: x2 - w2, y: y2 },
        { x: x2 + w2, y: y2 },
        { x: x1 + w1, y: y1 },
      ],
      true,
    );
  }
  private project(z: number, x: number, w: number, h: number): Projection {
    const scale = 0.85 / Math.max(1, z);
    return {
      x: w / 2 + (scale * x * w) / 2,
      y: h * 0.36 + (scale * 1000 * h) / 2,
      w: (scale * 1800 * w) / 2,
      scale,
    };
  }
  private car(x: number, y: number, size: number, color: number, steer = 0, player = false) {
    const g = this.g,
      s = size;
    const hatch = player && this.vehicle.body === 'hatch',
      coupe = player && this.vehicle.body === 'coupe';
    const roof = hatch ? 86 : coupe ? 64 : 74;
    g.fillStyle(0x061126, 0.4);
    g.fillEllipse(x, y + 4 * s, 155 * s, 28 * s);
    g.fillStyle(0x101726);
    g.fillRoundedRect(x - 72 * s, y - 36 * s, 24 * s, 41 * s, 4 * s);
    g.fillRoundedRect(x + 48 * s, y - 36 * s, 24 * s, 41 * s, 4 * s);
    g.fillStyle(color);
    g.fillPoints(
      [
        { x: x - 67 * s, y: y },
        { x: x - 63 * s + steer * 8 * s, y: y - 39 * s },
        { x: x - 41 * s + steer * 13 * s, y: y - roof * s },
        { x: x + 36 * s + steer * 13 * s, y: y - roof * s },
        { x: x + 62 * s + steer * 8 * s, y: y - 39 * s },
        { x: x + 67 * s, y: y },
      ],
      true,
    );
    g.fillStyle(0x172e4a);
    g.fillPoints(
      [
        { x: x - 40 * s + steer * 13 * s, y: y - (roof - 6) * s },
        { x: x + 34 * s + steer * 13 * s, y: y - (roof - 6) * s },
        { x: x + 48 * s + steer * 8 * s, y: y - 43 * s },
        { x: x - 49 * s + steer * 8 * s, y: y - 43 * s },
      ],
      true,
    );
    g.fillStyle(0xc2ebfa, 0.65);
    g.fillTriangle(
      x - 35 * s + steer * 13 * s,
      y - (roof - 9) * s,
      x + 29 * s + steer * 13 * s,
      y - (roof - 9) * s,
      x - 43 * s + steer * 8 * s,
      y - 47 * s,
    );
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(x - 59 * s, y - 35 * s, 118 * s, 5 * s);
    g.fillStyle(0x152039);
    g.fillRect(x - 57 * s, y - 15 * s, 114 * s, 12 * s);
    g.fillStyle(player ? 0xff5264 : 0xff4e57);
    g.fillRect(x - 55 * s, y - 29 * s, 28 * s, 9 * s);
    g.fillRect(x + 27 * s, y - 29 * s, 28 * s, 9 * s);
    g.fillStyle(0xf8f5df);
    g.fillRect(x - 14 * s, y - 12 * s, 28 * s, 8 * s);
    g.fillStyle(0x101b30);
    g.fillRect(x - 73 * s + steer * 5 * s, y - 43 * s, 146 * s, 7 * s);
    g.fillRect(x - 49 * s, y - 43 * s, 7 * s, 12 * s);
    g.fillRect(x + 42 * s, y - 43 * s, 7 * s, 12 * s);
    if (player) {
      g.fillStyle(this.vehicle.accent);
      g.fillRect(x - 9 * s, y - 40 * s, 6 * s, 23 * s);
      g.fillRect(x + 3 * s, y - 40 * s, 6 * s, 23 * s);
      if (hatch) {
        g.fillStyle(this.vehicle.accent);
        g.fillRect(x - 59 * s, y - 21 * s, 118 * s, 5 * s);
        g.fillStyle(0xff5264);
        g.fillRect(x - 61 * s, y - 39 * s, 9 * s, 23 * s);
        g.fillRect(x + 52 * s, y - 39 * s, 9 * s, 23 * s);
      }
      if (coupe) {
        g.fillStyle(0xff5264);
        for (const side of [-1, 1]) {
          g.fillCircle(x + side * 43 * s, y - 25 * s, 6 * s);
          g.fillCircle(x + side * 29 * s, y - 25 * s, 5 * s);
        }
      }
      if (this.vehicle.id === 'impreza') {
        g.fillStyle(this.vehicle.accent);
        g.fillRect(x - 68 * s, y - 8 * s, 8 * s, 9 * s);
        g.fillRect(x + 60 * s, y - 8 * s, 8 * s, 9 * s);
      }
    }
  }
  private draw() {
    const g = this.g,
      w = this.scale.width,
      h = this.scale.height;
    g.clear();
    const sunset = sunsetProgress(this.drivingSeconds);
    // Draw the sky in bands so the sunset also works with the Canvas renderer.
    const blend = (a: number, b: number, t: number) =>
      Phaser.Display.Color.GetColor(
        Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t),
        Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t),
        Math.round((a & 255) * (1 - t) + (b & 255) * t),
      );
    const palette = (day: number, dusk: number) => blend(day, dusk, sunset);
    for (let i = 0; i < 80; i++) {
      const t = i / 79,
        dusk =
          t < 0.52
            ? blend(0x281448, 0xb34c87, t / 0.52)
            : blend(0xb34c87, 0xffab73, (t - 0.52) / 0.48);
      const color = palette(blend(0x267bce, 0x9ce7f2, t), dusk);
      g.fillStyle(color);
      g.fillRect(0, (i * h * 0.46) / 80, w, (h * 0.46) / 80 + 1);
    }
    const offset = Math.sin((this.distance / LENGTH) * Math.PI * 2) * w * 0.08;
    const sunX = w * (0.76 - 0.1 * sunset) - offset * 0.16,
      sunY = h * (0.16 + 0.065 * sunset),
      radius = h * 0.062 * (1 - sunset) + Math.min(h * 0.15, w * 0.15) * sunset;
    for (let ring = 7; ring > 0; ring--) {
      g.fillStyle(0xff925e, 0.018 * sunset);
      g.fillCircle(sunX, sunY, radius * (1 + ring * 0.15));
    }
    // Horizontal gaps grow toward the horizon, like a classic arcade sunset.
    const gaps = [
      [0.48, 0.5],
      [0.59, 0.62],
      [0.7, 0.74],
      [0.81, 0.86],
      [0.93, 0.99],
    ];
    for (let row = 0; row < 120; row++) {
      const t = (row + 0.5) / 120,
        gap = gaps.some(([start, end]) => t >= start && t < end);
      const dy = (t * 2 - 1) * radius,
        half = Math.sqrt(Math.max(0, radius * radius - dy * dy));
      g.fillStyle(
        palette(
          0xffe8a2,
          t < 0.5 ? blend(0xfff3a1, 0xffb34d, t * 2) : blend(0xffb34d, 0xff4e82, (t - 0.5) * 2),
        ),
        gap ? 1 - sunset : 1,
      );
      g.fillRect(
        sunX - half,
        sunY - radius + (row * radius * 2) / 120,
        half * 2,
        (radius * 2) / 120 + 0.3,
      );
    }
    for (let i = 0; i < 5; i++) {
      const cloudX =
        ((((i * 217 - this.playerX * 12 - this.distance * 0.00015) % (w + 200)) + w + 200) %
          (w + 200)) -
        100;
      g.fillStyle(palette(0xffffff, 0xffc3c1), 0.5 - 0.36 * sunset);
      g.fillEllipse(cloudX, h * (0.075 + (i % 3) * 0.043), 125 + i * 10, 4 + (i % 2) * 3);
    }
    // Keep the distant ridges low so the striped sun stays in view.
    for (let layer = 0; layer < 2; layer++) {
      g.fillStyle(layer ? palette(0x668cb5, 0x533965) : palette(0x83aec7, 0x885071));
      for (let i = -1; i < 10; i++)
        g.fillTriangle(
          (i * w) / 7 + offset * (layer ? 0.65 : 0.35),
          h * 0.385,
          ((i + 0.65) * w) / 7 + offset * (layer ? 0.65 : 0.35),
          h * (0.305 + layer * 0.035) + Math.sin(i * 2 + layer) * h * 0.024,
          ((i + 1.6) * w) / 7 + offset * (layer ? 0.65 : 0.35),
          h * 0.385,
        );
    }
    g.fillStyle(palette(0x218fa4, 0xb85c87));
    g.fillRect(0, h * 0.36, w, h * 0.09);
    for (let i = 0; i < 8; i++) {
      const reflectionWidth = radius * (1.25 - i * 0.09);
      g.fillStyle(0xffc184, (0.3 - i * 0.025) * sunset);
      g.fillRect(
        sunX - reflectionWidth / 2 + Math.sin(i * 2) * 6,
        h * (0.365 + i * 0.009),
        reflectionWidth,
        Math.max(1, h * 0.003),
      );
    }
    g.fillStyle(palette(0x56af73, 0x75536d));
    g.fillRect(0, h * 0.42, w, h * 0.58);
    const grass = [palette(0x5bb15b, 0x79516e), palette(0x65b862, 0x865a76)];
    const curb = [palette(0xeb4e42, 0xe95d81), palette(0xf1ecd9, 0xffddbd)];
    const asphalt = [palette(0x505a6b, 0x4b4762), palette(0x545e70, 0x514d68)];
    const palmTrunk = palette(0x966c43, 0x40233d),
      palmLeaf = palette(0x237b50, 0x34203e);
    const pine = palette(0x1c6853, 0x332642),
      pineLight = palette(0x2d8062, 0x48304f);
    const base = Math.floor(this.distance / SEGMENT),
      fraction = (this.distance % SEGMENT) / SEGMENT;
    let x = 0,
      dx = -this.curve(base) * fraction;
    const projections: { p: Projection; index: number; z: number }[] = [];
    for (let n = 0; n < 180; n++) {
      const index = (base + n) % COUNT,
        z = (n - fraction) * SEGMENT;
      x += dx;
      dx += this.curve(index);
      projections.push({ p: this.project(z, x - this.playerX * 1800, w, h), index, z });
    }
    for (let n = 179; n > 0; n--) {
      const a = projections[n - 1],
        b = projections[n];
      if (a.z < 300) continue;
      const light = Math.floor(b.index / 3) % 2 === 0;
      g.fillStyle(grass[Number(light)]);
      g.fillRect(0, b.p.y, w, a.p.y - b.p.y + 1);
      this.quad(curb[Number(light)], a.p.x, a.p.y, a.p.w * 1.12, b.p.x, b.p.y, b.p.w * 1.12);
      this.quad(asphalt[Number(light)], a.p.x, a.p.y, a.p.w, b.p.x, b.p.y, b.p.w);
      for (const side of [-1, 1])
        this.quad(
          0xf7edcc,
          a.p.x + side * a.p.w * 0.97,
          a.p.y,
          a.p.w * 0.012,
          b.p.x + side * b.p.w * 0.97,
          b.p.y,
          b.p.w * 0.012,
        );
      if (light)
        for (const lane of [-1 / 3, 1 / 3])
          this.quad(
            0xe9e4c9,
            a.p.x + lane * a.p.w,
            a.p.y,
            a.p.w * 0.009,
            b.p.x + lane * b.p.w,
            b.p.y,
            b.p.w * 0.009,
          );
      if (b.index < 3) {
        for (let c = 0; c < 12; c++)
          this.quad(
            (c + b.index) % 2 ? 0xffffff : 0x182237,
            a.p.x + a.p.w * (-1 + (c + 0.5) / 6),
            a.p.y,
            a.p.w / 12,
            b.p.x + b.p.w * (-1 + (c + 0.5) / 6),
            b.p.y,
            b.p.w / 12,
          );
      }
      const scale = b.p.scale * w;
      if (b.index % 10 === 0) {
        for (const side of [-1, 1]) {
          const px = b.p.x + side * b.p.w * 1.4,
            py = b.p.y,
            s = scale * 0.75;
          g.fillStyle(0xe9e8de);
          g.fillRect(px - s * 3, py - s * 55, s * 6, s * 55);
          g.fillStyle(0xea4048);
          g.fillRect(px - s * 3, py - s * 55, s * 6, s * 14);
        }
      }
      if (b.index % 17 === 0) {
        const side = b.index % 34 === 0 ? -1 : 1,
          px = b.p.x + side * b.p.w * 1.9,
          py = b.p.y,
          s = scale;
        if (this.stage === 2) {
          g.fillStyle(pine);
          g.fillTriangle(px, py - s * 260, px - s * 75, py, px + s * 75, py);
          g.fillStyle(pineLight);
          g.fillTriangle(px, py - s * 260, px - s * 75, py, px, py - s * 25);
        } else {
          g.lineStyle(s * 13, palmTrunk);
          g.lineBetween(px, py, px + s * 20, py - s * 220);
          g.lineStyle(s * 12, palmLeaf);
          for (let l = 0; l < 6; l++) {
            const angle = (l * Math.PI) / 3;
            g.lineBetween(
              px + s * 20,
              py - s * 220,
              px + s * 20 + Math.cos(angle) * s * 100,
              py - s * 200 + Math.sin(angle) * s * 60,
            );
          }
        }
      }
      if (b.index % 150 === 60) {
        const s = scale,
          px = b.p.x - b.p.w * 2.1,
          py = b.p.y;
        g.fillStyle(0xd0deeb);
        g.fillRect(px - s * 180, py - s * 120, s * 350, s * 120);
        g.fillStyle(0x254477);
        for (let row = 0; row < 4; row++)
          g.fillRect(px - s * 175, py - s * (25 + row * 24), s * 340, s * 9);
        g.fillStyle(0xf1be42);
        g.fillTriangle(px - s * 200, py - s * 130, px, py - s * 180, px + s * 190, py - s * 130);
      }
      if (b.index % 90 === 35) {
        const px = b.p.x - b.p.w * 1.65,
          py = b.p.y,
          s = scale;
        g.fillStyle(0xd2dce6);
        g.fillRect(px - s * 4, py - s * 145, s * 8, s * 145);
        g.fillStyle(0x172d57);
        g.fillRect(px - s * 120, py - s * 210, s * 240, s * 90);
        g.fillStyle(0xffd448);
        g.fillTriangle(
          px + s * 80,
          py - s * 165,
          px + s * 30,
          py - s * 190,
          px + s * 30,
          py - s * 140,
        );
        g.fillRect(px - s * 80, py - s * 174, s * 105, s * 18);
      }
      for (const rival of this.rivals) {
        const relative = (((rival.z - this.distance) % LENGTH) + LENGTH) % LENGTH;
        if (relative >= a.z && relative < b.z && relative > 800) {
          const p = Phaser.Math.Linear(a.p.y, b.p.y, (relative - a.z) / SEGMENT),
            half = Phaser.Math.Linear(a.p.w, b.p.w, (relative - a.z) / SEGMENT);
          this.car(b.p.x + half * rival.x, p, half / 430, rival.color);
        }
      }
    }
    const carX = w / 2 + this.steering * w * 0.022,
      carY = h * 0.92,
      bob = Math.sin(this.distance * 0.015) * Math.min(this.speed / MAX_SPEED, 1) * 1.5;
    if (this.drift && this.speed > 3000) {
      for (let i = 0; i < 9; i++) {
        g.fillStyle(0xe2e6ed, 0.09);
        g.fillCircle(carX + (i % 2 ? 1 : -1) * (45 + i * 7), carY - i * 3, 8 + i * 2);
      }
    }
    if (this.hitCooldown <= 0 || Math.floor(this.hitCooldown * 12) % 2 === 0)
      this.car(
        carX,
        carY + bob,
        Math.min(w / 820, h / 450) * 0.92,
        this.vehicle.color,
        this.steering,
        true,
      );
  }
  control(command: GameCommand) {
    if (command === 'start' && !this.finished) {
      this.active = true;
      this.paused = false;
    }
    if (command === 'pause') this.paused = !this.paused;
    if (command === 'reset') {
      this.drivingSeconds = 0;
      this.active = false;
      this.paused = false;
      this.finished = false;
      this.elapsed = 0;
      this.distance = 0;
      this.speed = 0;
      this.playerX = 0;
      this.steering = 0;
      this.remaining = 90;
      this.lap = 1;
      this.hitCooldown = 0;
      this.touch.clear();
      this.resetRivals();
      this.emit();
      this.draw();
    }
    if (command === 'sound') {
      this.muted = !this.muted;
      if (!this.audio) {
        this.audio = new AudioContext();
        this.oscillator = this.audio.createOscillator();
        this.gain = this.audio.createGain();
        this.oscillator.type = 'sawtooth';
        this.oscillator.connect(this.gain);
        this.gain.connect(this.audio.destination);
        this.gain.gain.value = 0;
        this.oscillator.start();
      }
      void this.audio.resume();
    }
  }
  setTouch(key: string, pressed: boolean) {
    if (pressed) this.touch.add(key);
    else this.touch.delete(key);
  }
  private emit() {
    this.report({
      speed: Math.round((this.speed / MAX_SPEED) * 320),
      time: this.elapsed,
      lap: this.lap,
      best: this.best,
      surface: Math.abs(this.playerX) > 1 ? 'Off-road' : 'Asphalt',
      progress: Math.min(this.distance / (LENGTH * 3), 1),
      position: 1 + this.rivals.filter((r) => r.distance > this.distance).length,
      remaining: Math.max(0, Math.ceil(this.remaining)),
      finished: this.finished && this.distance >= LENGTH * 3,
      sunset: sunsetProgress(this.drivingSeconds),
    });
  }
  update(time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.1);
    if (this.gain) this.gain.gain.value = this.active && !this.paused && !this.muted ? 0.022 : 0;
    if (this.active && !this.paused) {
      this.elapsed += dt;
      this.remaining -= dt;
      this.hitCooldown -= dt;
      const down = (...keys: string[]) =>
        keys.some((k) => this.keys[k]?.isDown || this.touch.has(k));
      const throttle = down('UP', 'W'),
        brake = down('DOWN', 'S');
      this.drift = down('SPACE');
      const steer = (down('RIGHT', 'D') ? 1 : 0) - (down('LEFT', 'A') ? 1 : 0);
      const ratio = this.speed / MAX_SPEED;
      this.steering = Phaser.Math.Linear(this.steering, steer, Math.min(1, dt * 9));
      this.speed = Phaser.Math.Clamp(
        this.speed +
          (throttle ? 4400 * this.vehicle.acceleration : -1300) * dt -
          (brake ? 8500 * dt : 0) -
          (this.drift ? 1400 * dt : 0),
        0,
        MAX_SPEED * this.vehicle.topSpeed,
      );
      this.playerX +=
        steer * dt * 1.5 * this.vehicle.handling * ratio * (this.drift ? 1.45 : 1) -
        this.curve(Math.floor(this.distance / SEGMENT)) * ratio * ratio * dt * 0.42;
      if (Math.abs(this.playerX) > 1.04) this.speed = Math.max(0, this.speed - 6000 * dt);
      this.playerX = Phaser.Math.Clamp(this.playerX, -1.8, 1.8);
      if (this.speed > 100) this.drivingSeconds += dt;
      this.distance += this.speed * dt;
      for (const rival of this.rivals) {
        rival.distance += rival.speed * dt;
        rival.z = rival.distance % LENGTH;
        const gap = rival.distance - this.distance;
        if (
          gap > 650 &&
          gap < 1400 &&
          Math.abs(this.playerX - rival.x) < 0.23 &&
          this.hitCooldown <= 0
        ) {
          this.speed *= 0.48;
          this.hitCooldown = 1.5;
          this.playerX += this.playerX > rival.x ? 0.18 : -0.18;
        }
      }
      const nextLap = Math.min(3, Math.floor(this.distance / LENGTH) + 1);
      if (nextLap > this.lap) {
        this.remaining += 25;
        this.lap = nextLap;
      }
      if (this.distance >= LENGTH * 3 || this.remaining <= 0) {
        this.active = false;
        this.finished = true;
        if (this.distance >= LENGTH * 3 && (!this.best || this.elapsed < this.best)) {
          this.best = this.elapsed;
          try {
            localStorage.setItem('arcade-best-' + this.stage, String(this.best));
          } catch {
            /* Optional persistence. */
          }
        }
        this.emit();
        this.onFinish();
      }
      if (this.oscillator) this.oscillator.frequency.value = 45 + ratio * 140;
    }
    this.draw();
    if (time - this.reportAt > 70) {
      this.emit();
      this.reportAt = time;
    }
  }
}
