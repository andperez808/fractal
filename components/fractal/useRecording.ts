'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
export function useRecording(
  canvas: MutableRefObject<HTMLCanvasElement | null>,
  notify: (s: string) => void,
) {
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    mounted = useRef(true);
  const [active, setActive] = useState(false),
    [seconds, setSeconds] = useState(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  const toggle = useCallback(() => {
    if (recorder.current?.state === 'recording') {
      recorder.current.stop();
      return;
    }
    const c = canvas.current;
    if (!c || typeof MediaRecorder === 'undefined' || !c.captureStream) {
      notify('Canvas video recording is unavailable in this browser.');
      return;
    }
    try {
      const mime = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime) {
        notify('No supported video export format was found.');
        return;
      }
      const capture = c.captureStream(30);
      stream.current = capture;
      const rec = new MediaRecorder(capture, {
        mimeType: mime,
        videoBitsPerSecond: 6000000,
      });
      recorder.current = rec;
      const chunks: Blob[] = [];
      let bytes = 0;
      rec.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          bytes += e.data.size;
        }
        if (bytes > 250 * 1024 * 1024 && rec.state === 'recording') {
          rec.stop();
          notify('Recording reached the memory limit and has been saved.');
        }
      };
      rec.onerror = () => {
        notify('Recording failed. Try again at a lower detail level.');
        if (rec.state === 'recording') rec.stop();
      };
      rec.onstop = () => {
        delete c.dataset.recording;
        capture.getTracks().forEach((t) => t.stop());
        if (mounted.current) {
          setActive(false);
          if (chunks.length) {
            const blob = new Blob(chunks, { type: rec.mimeType });
            const url = URL.createObjectURL(blob),
              a = document.createElement('a');
            a.href = url;
            a.download =
              'fracta-' +
              Date.now() +
              (rec.mimeType.includes('mp4') ? '.mp4' : '.webm');
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            notify('Video saved.');
          }
        }
        recorder.current = null;
      };
      rec.start(1000);
      c.dataset.recording = 'true';
      setSeconds(0);
      setActive(true);
      notify('Recording the fractal canvas. Press stop to save.');
    } catch {
      stream.current?.getTracks().forEach((t) => t.stop());
      notify('Video recording could not start.');
      setActive(false);
    }
  }, [canvas, notify]);
  return { active, seconds, toggle };
}
