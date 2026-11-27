// 执行器解析：优先包内 JS 入口（避免 Windows 上 spawn .cmd 的 EINVAL），其次 .bin / PATH。
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const suffix = process.platform === 'win32' ? '.cmd' : '';

const PACKAGE_SCRIPTS = {
  eslint: ['eslint', 'bin', 'eslint.js'],
  prettier: ['prettier', 'bin', 'prettier.cjs'],
  stylelint: ['stylelint', 'bin', 'stylelint.mjs'],
};

export const resolveBinary = (name, cwd) => {
  const local = join(cwd, 'node_modules', '.bin', `${name}${suffix}`);
  return existsSync(local) ? local : name;
};

/** 启动工具：有包内脚本时用 `node <script>`，否则回退到 resolveBinary。 */
export const spawnTool = (name, args, options) => {
  const parts = PACKAGE_SCRIPTS[name];
  if (parts !== undefined) {
    const script = join(options.cwd, 'node_modules', ...parts);
    if (existsSync(script)) {
      return spawnSync(process.execPath, [script, ...args], options);
    }
  }
  return spawnSync(resolveBinary(name, options.cwd), args, options);
};
