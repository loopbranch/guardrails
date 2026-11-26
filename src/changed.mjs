// 未显式传入文件时，按 git 改动选择文件；只读命令，不修改工作区。
import { spawnSync } from 'node:child_process';

const git = (args, cwd) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} 失败：${result.stderr.trim()}`);
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

export const changedFiles = ({ cwd, base = 'HEAD' }) => {
  const tracked = git(['diff', '--name-only', base], cwd);
  const untracked = git(['ls-files', '--others', '--exclude-standard'], cwd);
  return [...new Set([...tracked, ...untracked])];
};
