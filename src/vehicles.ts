export const vehicles = [
  {
    id: 'impreza',
    name: 'Subaru Impreza',
    edition: 'BLUE & GOLD',
    description: 'A planted all-rounder. Quick off the line and composed through corners.',
    color: 0x2867e8,
    accent: 0xffce49,
    body: 'sedan',
    acceleration: 1.04,
    handling: 1,
    topSpeed: 0.98,
    stats: [4, 4, 4],
  },
  {
    id: 'evo',
    name: 'Mitsubishi Lancer Evo',
    edition: 'SCARLET ATTACK',
    description: 'Sharp turn-in and punchy acceleration. Built to attack the next bend.',
    color: 0xe74449,
    accent: 0xf1f3fa,
    body: 'sedan',
    acceleration: 1.09,
    handling: 1.1,
    topSpeed: 0.95,
    stats: [5, 5, 3],
  },
  {
    id: 'delta',
    name: 'Lancia Delta',
    edition: 'BOX-FRESH LEGEND',
    description: 'A nimble hatchback with the strongest steering response in the garage.',
    color: 0xeee9d9,
    accent: 0xe34c4b,
    body: 'hatch',
    acceleration: 0.98,
    handling: 1.2,
    topSpeed: 0.96,
    stats: [3, 5, 3],
  },
  {
    id: 'celica',
    name: 'Toyota Celica',
    edition: 'TURBO HORIZON',
    description: 'A low-slung coupe. Trade a little acceleration for extra straight-line speed.',
    color: 0x33ae82,
    accent: 0xf5f1df,
    body: 'coupe',
    acceleration: 0.94,
    handling: 0.96,
    topSpeed: 1.04,
    stats: [3, 3, 5],
  },
] as const;
export type RallyVehicle = (typeof vehicles)[number];
export function loadVehicle(): RallyVehicle {
  try {
    return vehicles.find((car) => car.id === localStorage.getItem('rally-vehicle')) ?? vehicles[0];
  } catch {
    return vehicles[0];
  }
}
