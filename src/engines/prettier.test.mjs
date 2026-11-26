import process from 'node:process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkFormat } from './prettier.mjs';

test('缺少 prettier 执行器时明确失败，不静默跳过', () => {
  const original = process.env.PATH;
  process.env.PATH = '';
  try {
    const cwd = mkdtempSync(join(tmpdir(), 'standards-missing-'));
    assert.throws(() => checkFormat({ files: ['a.ts'], cwd }), /缺少 prettier 执行器/u);
  } finally {
    process.env.PATH = original;
  }
});
