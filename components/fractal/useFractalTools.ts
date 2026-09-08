'use client';
import { useEffect, type MutableRefObject } from 'react';
import type { Settings } from '@/lib/fractal/types';
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
export function useFractalTools(
  settings: MutableRefObject<Settings>,
  update: (p: Partial<Settings>) => void,
  reset: () => void,
) {
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const life = new AbortController();
    const tools: Tool[] = [
      {
        name: 'read_fractal_settings',
        description: 'Read the current fractal world and controls.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({ ...settings.current }),
      },
      {
        name: 'configure_fractal',
        description:
          'Change the visible fractal world, color preset, or animation pause state. Does not activate the camera.',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'integer', enum: [0, 1] },
            palette: { type: 'integer', enum: [0, 1, 2, 3] },
            paused: { type: 'boolean' },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async (input) => {
          if (!input || typeof input !== 'object' || Array.isArray(input))
            throw Error('Expected a settings object');
          const p = input as Record<string, unknown>;
          for (const key of Object.keys(p))
            if (!['kind', 'palette', 'paused'].includes(key))
              throw Error('Unknown setting');
          if (p.kind !== undefined && p.kind !== 0 && p.kind !== 1)
            throw Error('Invalid world');
          if (
            p.palette !== undefined &&
            (!Number.isInteger(p.palette) ||
              Number(p.palette) < 0 ||
              Number(p.palette) > 3)
          )
            throw Error('Invalid palette');
          if (p.paused !== undefined && typeof p.paused !== 'boolean')
            throw Error('Invalid pause state');
          update(p as Partial<Settings>);
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          return { ...settings.current };
        },
      },
      {
        name: 'reset_fractal_view',
        description:
          'Recenter the fractal and reset zoom, rotation, and inertia.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async () => {
          reset();
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          return { reset: true };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: life.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => life.abort();
  }, [settings, update, reset]);
}
