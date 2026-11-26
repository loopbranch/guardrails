// 执行器解析：优先项目内 node_modules/.bin，其次 PATH；缺失由调用方明确报错。
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const suffix = process.platform === 'win32' ? '.cmd' : '';

export const resolveBinary = (name, cwd) => {
  const local = join(cwd, 'node_modules', '.bin', `${name}${suffix}`);
  return existsSync(local) ? local : name;
};
