'use client';
import { useEffect, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from '@/lib/fractal/shaders';
import { clamp, type Settings, type View } from '@/lib/fractal/types';
export default function Scene({
  canvasRef,
  settings,
  view,
  onStatus,
}: {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  settings: MutableRefObject<Settings>;
  view: MutableRefObject<View>;
  onStatus: (s: string) => void;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      onStatus(
        'WebGL 2 unavailable. Enable hardware acceleration in your browser.',
      );
      return;
    }
    const uniforms = {
      uResolution: { value: new THREE.Vector2() },
      uPan: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uDistance: { value: 3.5 },
      uYaw: { value: 0 },
      uPitch: { value: 0 },
      uRoll: { value: 0 },
      uDetail: { value: 0.65 },
      uMorph: { value: 0.2 },
      uPalette: { value: 0 },
      uKind: { value: 0 },
      uJourney: { value: 0 },
      uTravel: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
      }),
      geometry = new THREE.PlaneGeometry(2, 2),
      scene = new THREE.Scene(),
      camera = new THREE.Camera();
    scene.add(new THREE.Mesh(geometry, material));
    let frame = 0,
      last = performance.now(),
      elapsed = 0,
      quality = 0.7,
      count = 0,
      total = 0,
      journey = 0,
      lost = false,
      shaderFailed = false;
    renderer.debug.onShaderError = () => {
      shaderFailed = true;
      onStatus('The fractal shader could not compile on this device.');
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      renderer.setSize(
        Math.max(1, Math.round(r.width * quality)),
        Math.max(1, Math.round(r.height * quality)),
        false,
      );
      uniforms.uResolution.value.set(canvas.width, canvas.height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const contextLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      onStatus('Graphics interrupted. Waiting for recovery…');
    };
    const contextRestored = () => {
      lost = false;
      resize();
      onStatus('Graphics restored');
    };
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (lost || shaderFailed || document.hidden) {
        last = now;
        return;
      }
      const raw = (now - last) / 1000,
        dt = Math.min(raw, 0.05);
      last = now;
      const s = settings.current,
        v = view.current;
      if (!s.paused) {
        elapsed += dt;
        if (!v.interacting) {
          v.yaw += s.spin * dt;
          if (s.inertia) {
            v.yaw += v.vx * dt;
            v.pitch += v.vy * dt;
            v.roll += v.vr * dt;
          }
          const decay = Math.exp(-3 * dt);
          v.vx *= decay;
          v.vy *= decay;
          v.vr *= decay;
        }
        if (s.journey) journey = (journey + dt * s.speed * 1.5) % 5;
      }
      v.distance = clamp(v.distance, 1.25, 8);
      v.pitch = clamp(v.pitch, -1.5, 1.5);
      v.x = clamp(v.x, -2.5, 2.5);
      v.y = clamp(v.y, -2.5, 2.5);
      uniforms.uPan.value.set(v.x, v.y);
      uniforms.uTime.value = elapsed;
      uniforms.uDistance.value = v.distance;
      uniforms.uJourney.value = s.journey ? 1 : 0;
      uniforms.uTravel.value = journey;
      uniforms.uYaw.value = v.yaw;
      uniforms.uPitch.value = v.pitch;
      uniforms.uRoll.value = v.roll;
      uniforms.uDetail.value = s.detail;
      uniforms.uMorph.value = s.morph;
      uniforms.uPalette.value = s.palette;
      uniforms.uKind.value = s.kind;
      renderer.render(scene, camera);
      count++;
      total += raw;
      if (total > 2) {
        const fps = Math.round(count / total);
        if (!shaderFailed) onStatus(fps + ' FPS · adaptive quality');
        const next = clamp(
          quality * (fps < 32 ? 0.82 : fps > 55 ? 1.08 : 1),
          0.3,
          Math.min(devicePixelRatio, 1.25),
        );
        if (!canvas.dataset.recording && Math.abs(next - quality) > 0.02) {
          quality = next;
          resize();
        }
        count = 0;
        total = 0;
      }
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [canvasRef, settings, view, onStatus]);
  return null;
}
