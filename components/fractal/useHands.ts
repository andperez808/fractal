'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { GestureEngine, type TrackedHand } from '@/lib/fractal/gestures';
import type { Settings, View } from '@/lib/fractal/types';
const edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];
export function useHands({
  video,
  overlay,
  settings,
  view,
  update,
  reset,
  notify,
}: {
  video: MutableRefObject<HTMLVideoElement | null>;
  overlay: MutableRefObject<HTMLCanvasElement | null>;
  settings: MutableRefObject<Settings>;
  view: MutableRefObject<View>;
  update: (p: Partial<Settings>) => void;
  reset: () => void;
  notify: (s: string) => void;
}) {
  const [state, setState] = useState<'off' | 'loading' | 'on'>('off'),
    [label, setLabel] = useState('Mouse and touch ready');
  const worker = useRef<Worker | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    engine = useRef(new GestureEngine()),
    generation = useRef(0),
    busy = useRef(false),
    watchdog = useRef<ReturnType<typeof setTimeout> | null>(null),
    mounted = useRef(true);
  const clean = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    if (watchdog.current) clearTimeout(watchdog.current);
    worker.current?.terminate();
    worker.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) {
      video.current.pause();
      video.current.srcObject = null;
    }
    engine.current.reset();
    view.current.interacting = false;
    busy.current = false;
  }, [video, view]);
  const stop = useCallback(() => {
    clean();
    setState('off');
    setLabel('Mouse and touch ready');
  }, [clean]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clean();
    };
  }, [clean]);
  const start = useCallback(async () => {
    clean();
    const token = generation.current;
    setState('loading');
    setLabel('Loading local hand tracking…');
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('Camera access requires localhost or HTTPS.');
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      if (token !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const vid = video.current;
      if (!vid) throw new Error('Camera preview unavailable.');
      vid.srcObject = media;
      await vid.play();
      if (token !== generation.current) return;
      const w = new Worker('/hand-worker.js');
      worker.current = w;
      const fail = (message: string) => {
        if (token !== generation.current || !mounted.current) return;
        clean();
        setState('off');
        setLabel('Camera unavailable');
        notify(message);
      };
      w.onerror = () =>
        fail(
          'Hand tracking could not load. You can retry or use mouse controls.',
        );
      watchdog.current = setTimeout(
        () => fail('Hand tracking timed out. Please retry.'),
        30000,
      );
      const tick = async () => {
        if (token !== generation.current) return;
        if (!busy.current && vid.readyState >= 2 && !document.hidden) {
          busy.current = true;
          try {
            const bitmap = await createImageBitmap(vid);
            if (token !== generation.current) {
              bitmap.close();
              return;
            }
            w.postMessage({ type: 'frame', bitmap, time: performance.now() }, [
              bitmap,
            ]);
            if (watchdog.current) clearTimeout(watchdog.current);
            watchdog.current = setTimeout(
              () => fail('Hand tracking stopped responding. Please retry.'),
              8000,
            );
          } catch {
            fail(
              'This browser cannot process camera frames. Try Chrome or Edge.',
            );
            return;
          }
        }
        timer.current = setTimeout(() => void tick(), 50);
      };
      w.onmessage = (e) => {
        if (token !== generation.current) return;
        const msg = e.data;
        if (msg.type === 'ready') {
          if (watchdog.current) clearTimeout(watchdog.current);
          setState('on');
          setLabel('Looking for your hands');
          void tick();
          return;
        }
        if (msg.type === 'error') {
          fail(msg.message);
          return;
        }
        if (msg.type === 'hands') {
          busy.current = false;
          if (watchdog.current) clearTimeout(watchdog.current);
          const hands = msg.hands as TrackedHand[];
          setLabel(
            engine.current.process(
              hands,
              performance.now(),
              settings.current,
              view.current,
              { update, reset },
            ),
          );
          const c = overlay.current,
            ctx = c?.getContext('2d');
          if (c && ctx) {
            c.width = 640;
            c.height = 480;
            ctx.clearRect(0, 0, 640, 480);
            ctx.strokeStyle = '#a0f0cd';
            ctx.fillStyle = '#d5fff0';
            ctx.lineWidth = 2;
            for (const hand of hands) {
              for (const [a, b] of edges) {
                ctx.beginPath();
                ctx.moveTo(hand.points[a].x * 640, hand.points[a].y * 480);
                ctx.lineTo(hand.points[b].x * 640, hand.points[b].y * 480);
                ctx.stroke();
              }
              for (const p of hand.points) {
                ctx.beginPath();
                ctx.arc(p.x * 640, p.y * 480, 3, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      };
      media.getVideoTracks()[0].onended = () =>
        fail('The camera was disconnected.');
      w.postMessage({ type: 'init' });
    } catch (error) {
      if (token !== generation.current || !mounted.current) return;
      clean();
      setState('off');
      setLabel('Mouse and touch ready');
      const err = error as Error;
      notify(
        err.name === 'NotAllowedError'
          ? 'Camera permission was declined. Allow it in your browser, then retry.'
          : err.name === 'NotFoundError'
            ? 'No camera found. Connect a camera, then retry.'
            : err.name === 'NotReadableError'
              ? 'Camera is busy in another application. Close it there, then retry.'
              : err.message || 'Camera could not start.',
      );
    }
  }, [clean, video, overlay, settings, view, update, reset, notify]);
  return { state, label, start, stop };
}
