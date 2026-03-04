import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const root = join(process.cwd());

describe('Basic syntactical and config checks', () => {
  it('package.json is valid JSON and has required scripts', () => {
    const path = join(root, 'package.json');
    const raw = readFileSync(path, 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    expect(pkg.name).toBe('job-tracker');
    const scripts = pkg.scripts as Record<string, string>;
    expect(scripts).toBeDefined();
    expect(scripts.build).toBe('next build');
    expect(scripts.lint).toBeDefined();
    expect(scripts.typecheck).toBeDefined();
    expect(scripts.test).toBeDefined();
  });

  it('tsconfig.json is valid JSON and has compilerOptions and include', () => {
    const path = join(root, 'tsconfig.json');
    const raw = readFileSync(path, 'utf-8');
    const tsconfig = JSON.parse(raw) as Record<string, unknown>;
    expect(tsconfig.compilerOptions).toBeDefined();
    const opts = tsconfig.compilerOptions as Record<string, unknown>;
    expect(opts.strict).toBe(true);
    expect(Array.isArray(tsconfig.include)).toBe(true);
  });

  it('TypeScript compiles (no syntax or type errors)', () => {
    execSync('npm run typecheck', {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 30_000,
    });
  });
});
