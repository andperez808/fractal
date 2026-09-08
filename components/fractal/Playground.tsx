'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Pause,
  Play,
  RotateCcw,
  Maximize,
  SlidersHorizontal,
  Download,
  Circle,
  Orbit,
  Move,
  Hand,
  ChevronRight,
  Aperture,
} from 'lucide-react';
import Scene from './Scene';
import { useFractalTools } from './useFractalTools';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { defaults, initialView, type Settings } from '@/lib/fractal/types';
import { useHands } from './useHands';
import { useRecording } from './useRecording';
export default function Playground() {
  const canvas = useRef<HTMLCanvasElement | null>(null),
    video = useRef<HTMLVideoElement | null>(null),
    overlay = useRef<HTMLCanvasElement | null>(null),
    settings = useRef({ ...defaults }),
    view = useRef(initialView());
  const [s, setS] = useState(settings.current),
    [status, setStatus] = useState('Preparing your fractal…'),
    [panel, setPanel] = useState(true),
    [notice, setNotice] = useState(''),
    [preview, setPreview] = useState(true);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const update = useCallback((patch: Partial<Settings>) => {
    settings.current = { ...settings.current, ...patch };
    setS(settings.current);
  }, []);
  const reset = useCallback(() => {
    view.current = initialView();
  }, []);
  useFractalTools(settings, update, reset);
  const hands = useHands({
    video,
    overlay,
    settings,
    view,
    update,
    reset,
    notify: setNotice,
  });
  const recording = useRecording(canvas, setNotice);
  useEffect(() => {
    if (innerWidth < 760) setPanel(false);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches)
      update({ paused: true });
  }, [update]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(t);
  }, [notice]);
  const finishPointer = (id: number) => {
    pointers.current.delete(id);
    view.current.interacting = pointers.current.size > 0;
  };
  return (
    <main className={panel ? 'studio panel-open' : 'studio'}>
      <canvas
        ref={canvas}
        className="fractal-canvas"
        aria-label="Interactive 3D fractal. Drag to rotate; scroll to zoom. Arrow keys rotate, plus and minus zoom, R resets, space pauses."
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          view.current.interacting = true;
          view.current.vx = 0;
          view.current.vy = 0;
          view.current.vr = 0;
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          const next = { x: e.clientX, y: e.clientY },
            v = view.current;
          const other = [...pointers.current.entries()].find(
            ([id]) => id !== e.pointerId,
          )?.[1];
          if (other) {
            const d0 = Math.hypot(prev.x - other.x, prev.y - other.y),
              d1 = Math.hypot(next.x - other.x, next.y - other.y);
            if (d0 > 15 && d1 > 15) v.distance *= d0 / d1;
            let a =
              Math.atan2(next.y - other.y, next.x - other.x) -
              Math.atan2(prev.y - other.y, prev.x - other.x);
            a = Math.atan2(Math.sin(a), Math.cos(a));
            v.roll += a;
            v.x -= (next.x - prev.x) / 600;
            v.y += (next.y - prev.y) / 600;
          } else {
            const dx = (next.x - prev.x) / 300,
              dy = (next.y - prev.y) / 300;
            if (e.shiftKey || settings.current.mode === 'move') {
              v.x -= dx;
              v.y += dy;
            } else {
              v.yaw += dx;
              v.pitch += dy;
              v.vx = dx * 20;
              v.vy = dy * 20;
            }
          }
          pointers.current.set(e.pointerId, next);
        }}
        onPointerUp={(e) => finishPointer(e.pointerId)}
        onPointerCancel={(e) => finishPointer(e.pointerId)}
        onLostPointerCapture={(e) => finishPointer(e.pointerId)}
        onWheel={(e) => {
          view.current.distance += e.deltaY * 0.003;
        }}
        onKeyDown={(e) => {
          if (
            [
              'ArrowLeft',
              'ArrowRight',
              'ArrowUp',
              'ArrowDown',
              ' ',
              '+',
              '-',
              '=',
              'r',
            ].includes(e.key)
          )
            e.preventDefault();
          if (e.key === 'ArrowLeft') view.current.yaw -= 0.1;
          if (e.key === 'ArrowRight') view.current.yaw += 0.1;
          if (e.key === 'ArrowUp') view.current.pitch -= 0.1;
          if (e.key === 'ArrowDown') view.current.pitch += 0.1;
          if (e.key === '+' || e.key === '=') view.current.distance -= 0.15;
          if (e.key === '-') view.current.distance += 0.15;
          if (e.key === 'r') reset();
          if (e.key === ' ') update({ paused: !settings.current.paused });
        }}
      />
      <Scene
        canvasRef={canvas}
        settings={settings}
        view={view}
        onStatus={setStatus}
      />
      <header className="topbar">
        <a className="brand" href="/" aria-label="Fracta home">
          <Aperture size={27} />
          <span>
            fracta<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="top-caption">THE INFINITE, IN YOUR HANDS</div>
        <button
          className="top-camera"
          disabled={hands.state === 'loading'}
          onClick={() =>
            hands.state === 'on' ? hands.stop() : void hands.start()
          }
        >
          <Camera size={16} />
          {hands.state === 'loading'
            ? 'Starting…'
            : hands.state === 'on'
              ? 'Camera off'
              : 'Use hands'}
        </button>
        <button
          className="icon-button"
          aria-label="Toggle controls"
          aria-expanded={panel}
          onClick={() => setPanel(!panel)}
        >
          <SlidersHorizontal size={20} />
        </button>
      </header>
      <section className="scene-title">
        <span className="eyebrow">LIVE EXPLORATION / 0{s.kind + 1}</span>
        <h1>{s.kind === 0 ? 'Mandelbulb' : 'Mandelbox'}</h1>
        <p>
          {s.kind === 0
            ? 'An organic universe. Infinitely intricate.'
            : 'Recursive worlds. New perspectives.'}
        </p>
      </section>
      {panel && (
        <aside className="control-panel" aria-label="Fractal controls">
          <div className="panel-heading">
            <span>EXPLORER</span>
            <span className="live-dot" /> LIVE
          </div>
          <div className="section-label">Fractal world</div>
          <div className="worlds">
            {['Mandelbulb', 'Mandelbox'].map((name, i) => (
              <button
                key={name}
                aria-pressed={s.kind === i}
                className={'world ' + (s.kind === i ? 'selected' : '')}
                onClick={() => {
                  update({ kind: i });
                  reset();
                }}
              >
                <Aperture className={'world-symbol world-' + i} size={28} />
                <span>
                  {name}
                  <small>
                    {i === 0 ? 'Organic & sculptural' : 'Geometric & recursive'}
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
          <div className="section-label">Color atmosphere</div>
          <div className="palettes">
            {['Aurora', 'Ember', 'Ocean', 'Prism'].map((name, i) => (
              <button
                key={name}
                title={name}
                aria-label={name + ' palette'}
                aria-pressed={s.palette === i}
                className={
                  'palette palette-' + i + (s.palette === i ? ' active' : '')
                }
                onClick={() => update({ palette: i })}
              />
            ))}
          </div>
          <div className="palette-name">
            {['Aurora', 'Ember', 'Ocean', 'Prism'][s.palette]}
            <span>COLOR PRESET</span>
          </div>
          {(
            [
              ['Detail', 'detail', 0, 1, 0.01],
              ['Shape morph', 'morph', 0, 1, 0.01],
              ['Spin direction & speed', 'spin', -0.7, 0.7, 0.01],
              ['Flight direction & speed', 'speed', -0.8, 0.8, 0.01],
            ] as const
          ).map(([label, key, min, max, step]) => (
            <div className="range" key={key}>
              <label id={key}>
                {label}
                <span>{Math.round(s[key] * 100)}%</span>
              </label>
              <Slider
                aria-labelledby={key}
                min={min}
                max={max}
                step={step}
                value={[s[key]]}
                onValueChange={(v) =>
                  update({ [key]: Array.isArray(v) ? v[0] : v })
                }
              />
            </div>
          ))}
          <div className="toggle-row">
            <span>Rotation inertia</span>
            <Switch
              aria-label="Rotation inertia"
              checked={s.inertia}
              onCheckedChange={(v) => update({ inertia: v })}
            />
          </div>
          <div className="toggle-row">
            <span>Endless flight</span>
            <Switch
              aria-label="Endless flight"
              checked={s.journey}
              onCheckedChange={(v) => update({ journey: v })}
            />
          </div>
          <p className="microcopy">
            Fly through repeating fractal structures. Not unlimited mathematical
            zoom.
          </p>
          <div className="panel-divider" />
          <div className="section-label">Interaction</div>
          <div className="segmented">
            <button
              aria-pressed={s.mode === 'move'}
              className={s.mode === 'move' ? 'active' : ''}
              onClick={() => update({ mode: 'move' })}
            >
              <Move size={15} /> Grab
            </button>
            <button
              aria-pressed={s.mode === 'rotate'}
              className={s.mode === 'rotate' ? 'active' : ''}
              onClick={() => update({ mode: 'rotate' })}
            >
              <Orbit size={16} /> Rotate
            </button>
          </div>
          <button
            className="camera-button"
            disabled={hands.state === 'loading'}
            onClick={() =>
              hands.state === 'on' ? hands.stop() : void hands.start()
            }
          >
            <Camera size={17} />
            {hands.state === 'loading'
              ? 'Starting camera…'
              : hands.state === 'on'
                ? 'Disable camera'
                : 'Enable camera'}
          </button>
          <div className="privacy">
            <span className="live-dot" />
            Camera stays on your device
          </div>
          <div className="gesture-status" role="status">
            {hands.label}
          </div>
          {hands.state === 'on' && (
            <>
              <div className="toggle-row">
                <span>Camera preview</span>
                <Switch
                  aria-label="Camera preview"
                  checked={preview}
                  onCheckedChange={setPreview}
                />
              </div>
              <div className="range">
                <label id="sensitivity">
                  Gesture sensitivity<span>{s.sensitivity.toFixed(1)}×</span>
                </label>
                <Slider
                  aria-labelledby="sensitivity"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={[s.sensitivity]}
                  onValueChange={(v) =>
                    update({ sensitivity: Array.isArray(v) ? v[0] : v })
                  }
                />
              </div>
            </>
          )}
          <details className="guide">
            <summary>Hand gestures & shortcuts</summary>
            <p>
              Pinch + drag: grab or rotate in the selected mode.
              <br />
              Two pinches: spread to zoom, twist to spin.
              <br />
              Hold one open palm: pause / resume.
              <br />
              Hold two open palms: reset.
              <br />
              Peace sign + move: palette / morph.
              <br />
              Mouse: drag; wheel: zoom; Shift + drag: pan.
              <br />
              Touch: two-finger zoom / twist.
              <br />
              Canvas keyboard: arrows rotate; + / − zoom; R resets; space
              pauses.
            </p>
          </details>
        </aside>
      )}
      <div
        className={
          'camera-preview ' +
          (hands.state !== 'on' || !preview ? 'hidden-preview' : '')
        }
      >
        <video ref={video} muted playsInline />
        <canvas ref={overlay} />
      </div>
      <div className="gesture-hint">
        <Hand size={20} />
        <div>
          <strong>
            {hands.state === 'on' ? hands.label : 'Reach into the infinite'}
          </strong>
          <span>
            {hands.state === 'on'
              ? 'Pinch to connect. Move to explore.'
              : 'Drag to ' +
                (s.mode === 'move' ? 'move' : 'rotate') +
                ' · scroll to explore'}
          </span>
        </div>
      </div>
      <footer className="bottom-bar">
        <span className="render-status">
          <span className="live-dot" />
          {status}
        </span>
        <div className="transport">
          <button
            title={s.paused ? 'Resume' : 'Pause'}
            aria-label={s.paused ? 'Resume' : 'Pause'}
            onClick={() => update({ paused: !s.paused })}
          >
            {s.paused ? <Play size={19} /> : <Pause size={19} />}
          </button>
          <button title="Reset view" aria-label="Reset view" onClick={reset}>
            <RotateCcw size={18} />
          </button>
          <span className="transport-divider" />
          <button
            title="Save screenshot"
            aria-label="Save screenshot"
            onClick={() => {
              try {
                const a = document.createElement('a');
                a.href = canvas.current!.toDataURL('image/png');
                a.download = 'fracta.png';
                a.click();
                setNotice('Screenshot saved.');
              } catch {
                setNotice('Screenshot could not be saved.');
              }
            }}
          >
            <Download size={18} />
          </button>
          <button
            title={recording.active ? 'Stop recording' : 'Record video'}
            aria-label={recording.active ? 'Stop recording' : 'Record video'}
            className={recording.active ? 'recording' : ''}
            onClick={recording.toggle}
          >
            <Circle
              size={17}
              fill={recording.active ? 'currentColor' : 'none'}
            />
            {recording.active && (
              <span className="record-time">{recording.seconds}s</span>
            )}
          </button>
          <button
            title="Fullscreen"
            aria-label="Fullscreen"
            onClick={() => {
              const p = document.fullscreenElement
                ? document.exitFullscreen()
                : document.documentElement.requestFullscreen();
              void p.catch(() =>
                setNotice('Fullscreen is unavailable in this browser.'),
              );
            }}
          >
            <Maximize size={18} />
          </button>
        </div>
        <span className="edition">FRACTAL STUDIO / 01</span>
      </footer>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
    </main>
  );
}
