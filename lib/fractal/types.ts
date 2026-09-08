export type Settings = {
  kind: number;
  palette: number;
  detail: number;
  morph: number;
  speed: number;
  spin: number;
  inertia: boolean;
  paused: boolean;
  journey: boolean;
  sensitivity: number;
  mode: 'move' | 'rotate';
};
export const defaults: Settings = {
  kind: 0,
  palette: 0,
  detail: 0.65,
  morph: 0.2,
  speed: 0.35,
  spin: 0.18,
  inertia: true,
  paused: false,
  journey: false,
  sensitivity: 1,
  mode: 'rotate',
};
export type View = {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  roll: number;
  distance: number;
  vx: number;
  vy: number;
  vr: number;
  interacting: boolean;
};
export const initialView = (): View => ({
  x: 0,
  y: 0,
  yaw: 0.3,
  pitch: 0.15,
  roll: 0,
  distance: 3.5,
  vx: 0,
  vy: 0,
  vr: 0,
  interacting: false,
});
export const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));
