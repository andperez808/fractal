import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
execFileSync(
  process.execPath,
  [
    'node_modules/typescript/bin/tsc',
    'lib/fractal/gestures.ts',
    'lib/fractal/types.ts',
    '--module',
    'commonjs',
    '--target',
    'es2020',
    '--outDir',
    '.test-build',
    '--skipLibCheck',
    '--esModuleInterop',
  ],
  { stdio: 'inherit' },
);
mkdirSync('.test-build', { recursive: true });
writeFileSync('.test-build/package.json', '{"type":"commonjs"}');
execFileSync(process.execPath, ['--test', 'tests/gestures.test.cjs'], {
  stdio: 'inherit',
});
