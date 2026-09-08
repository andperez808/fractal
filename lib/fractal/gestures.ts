import { clamp, type Settings, type View } from './types';
export type Point = { x: number; y: number; z?: number };
export type TrackedHand = { id: string; points: Point[] };
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
export class GestureEngine {
  private filtered = new Map<string, Point[]>();
  private pinched = new Map<string, boolean>();
  private previous: Point[] = [];
  private signature = '';
  private holding = '';
  private heldAt = 0;
  private fired = false;
  private lastTime = 0;
  reset() {
    this.filtered.clear();
    this.pinched.clear();
    this.previous = [];
    this.signature = '';
    this.holding = '';
    this.fired = false;
    this.lastTime = 0;
  }
  process(
    hands: TrackedHand[],
    now: number,
    s: Settings,
    v: View,
    actions: { update: (p: Partial<Settings>) => void; reset: () => void },
  ): string {
    const dt = clamp((now - this.lastTime) / 1000, 0.01, 0.15);
    if (this.lastTime && now - this.lastTime > 250) {
      this.previous = [];
      this.signature = '';
      this.filtered.clear();
    }
    this.lastTime = now;
    const ids = new Set(hands.map((h) => h.id));
    for (const id of this.filtered.keys())
      if (!ids.has(id)) {
        this.filtered.delete(id);
        this.pinched.delete(id);
      }
    const data = hands
      .filter((h) => h.points.length === 21)
      .map((h) => {
        const prev = this.filtered.get(h.id);
        const p = h.points.map((q, i) =>
          prev
            ? {
                x: prev[i].x + (q.x - prev[i].x) * 0.45,
                y: prev[i].y + (q.y - prev[i].y) * 0.45,
              }
            : q,
        );
        this.filtered.set(h.id, p);
        const scale = Math.max(dist(p[0], p[9]), 0.03);
        const was = this.pinched.get(h.id) || false;
        const pinch = dist(p[4], p[8]) / scale < (was ? 0.43 : 0.29);
        this.pinched.set(h.id, pinch);
        const extended = [8, 12, 16, 20].map(
          (i) => dist(p[i], p[0]) > dist(p[i - 2], p[0]) * 1.2,
        );
        return {
          id: h.id,
          p,
          pinch,
          center: mid(p[4], p[8]),
          open: extended.every(Boolean) && !pinch,
          peace:
            extended[0] &&
            extended[1] &&
            !extended[2] &&
            !extended[3] &&
            !pinch,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    const grabbed = data.filter((h) => h.pinch),
      hold = grabbed.length
        ? ''
        : data.length === 2 && data.every((h) => h.open)
          ? 'reset'
          : data.length === 1 && data[0].open
            ? 'pause'
            : '';
    if (hold !== this.holding) {
      this.holding = hold;
      this.heldAt = now;
      this.fired = false;
    }
    if (hold) {
      v.interacting = false;
      this.signature = '';
      this.previous = [];
      if (!this.fired && now - this.heldAt > 1100) {
        this.fired = true;
        if (hold === 'reset') actions.reset();
        else actions.update({ paused: !s.paused });
      }
      return this.fired
        ? hold === 'reset'
          ? 'View reset'
          : 'Pause toggled'
        : hold === 'reset'
          ? 'Hold both palms to reset…'
          : 'Hold palm to pause / resume…';
    }
    const peace = data.length === 1 && data[0].peace;
    const sig = grabbed.length
      ? grabbed.map((h) => h.id).join('|') + s.mode
      : peace
        ? 'peace'
        : '';
    const points = grabbed.length
      ? grabbed.map((h) => h.center)
      : peace
        ? [data[0].p[8]]
        : [];
    v.interacting = grabbed.length > 0;
    if (sig !== this.signature) {
      this.signature = sig;
      this.previous = points;
      v.vx = 0;
      v.vy = 0;
      v.vr = 0;
      return grabbed.length === 2
        ? 'Zoom + spin'
        : grabbed.length
          ? 'Pinch connected'
          : peace
            ? 'Palette + morph'
            : data.length
              ? 'Ready to pinch'
              : 'Looking for your hands';
    }
    if (points.length === 2 && this.previous.length === 2) {
      const [a, b] = points,
        [pa, pb] = this.previous;
      const d = dist(a, b),
        pd = dist(pa, pb);
      if (d > 0.07 && pd > 0.07) {
        v.distance = clamp(
          v.distance * Math.pow(pd / d, s.sensitivity),
          1.25,
          8,
        );
        const angle =
          Math.atan2(b.y - a.y, b.x - a.x) -
          Math.atan2(pb.y - pa.y, pb.x - pa.x);
        const da = Math.atan2(Math.sin(angle), Math.cos(angle));
        v.roll += da * s.sensitivity;
        v.vr = clamp(da / dt, -3, 3);
      }
      const c = mid(a, b),
        pc = mid(pa, pb);
      v.x -= (c.x - pc.x) * 3 * s.sensitivity;
      v.y += (c.y - pc.y) * 3 * s.sensitivity;
    } else if (points.length === 1 && this.previous.length === 1) {
      const dx = (points[0].x - this.previous[0].x) * s.sensitivity,
        dy = (points[0].y - this.previous[0].y) * s.sensitivity;
      if (peace) {
        actions.update({
          palette: clamp(Math.floor(points[0].x * 4), 0, 3),
          morph: clamp(1 - points[0].y, 0, 1),
        });
      } else if (s.mode === 'move') {
        v.x -= dx * 4;
        v.y += dy * 4;
      } else {
        v.yaw += dx * 5;
        v.pitch = clamp(v.pitch + dy * 4, -1.5, 1.5);
        v.vx = clamp((dx * 5) / dt, -3, 3);
        v.vy = clamp((dy * 4) / dt, -3, 3);
      }
    }
    this.previous = points;
    return grabbed.length === 2
      ? 'Zoom + spin'
      : grabbed.length
        ? s.mode === 'move'
          ? 'Grabbing'
          : 'Rotating'
        : peace
          ? 'Palette + morph'
          : data.length
            ? 'Ready to pinch'
            : 'Looking for your hands';
  }
}
