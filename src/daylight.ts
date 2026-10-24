export const SUNSET_START_SECONDS = 30;
export const SUNSET_FADE_SECONDS = 20;

/** Driving time excludes menus, pauses, and sitting still on the track. */
export function sunsetProgress(drivingSeconds: number): number {
  const t = Math.max(0, Math.min(1, (drivingSeconds - SUNSET_START_SECONDS) / SUNSET_FADE_SECONDS));
  return t * t * (3 - 2 * t);
}
