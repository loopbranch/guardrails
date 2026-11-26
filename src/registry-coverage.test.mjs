import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { loadLanguages, resolveLanguage } from './registry.mjs';

const CHECKED = /\.(?:ts|tsx|js|jsx|mjs|cjs|scss|css|sql|json|yml|yaml|md|mdx)$/u;

const trackedFiles = () => {
  try {
    return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((file) => CHECKED.test(file));
  } catch {
    return [];
  }
};

test('仓库内参与检查的每个扩展名都归属且仅归属一个语言', (t) => {
  const files = trackedFiles();
  if (files.length === 0) {
    t.diagnostic('不在 git 工作区，跳过仓库级归属检查');
    return;
  }
  const languages = loadLanguages();
  const unassigned = files.filter((file) => resolveLanguage(languages, file) === undefined);
  assert.deepEqual(unassigned.slice(0, 5), [], `未归属语言的文件示例：${unassigned.slice(0, 5).join(', ')}`);
  assert.ok(files.length > 100, `样本过少：${files.length}`);
});

test('未知扩展名不归属任何语言，由调用方报错', () => {
  const languages = loadLanguages();
  assert.equal(resolveLanguage(languages, 'assets/logo.png'), undefined);
});
