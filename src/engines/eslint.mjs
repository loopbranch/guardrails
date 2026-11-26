// ESLint 执行器：读取项目自身配置；缺失时明确失败。
import { spawnSync } from 'node:child_process';
import { resolveBinary } from './binary.mjs';

const run = (args, cwd) => {
  const result = spawnSync(resolveBinary('eslint', cwd), ['--format', 'json', ...args], { cwd, encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') {
    throw new Error('缺少 eslint 执行器：请在项目中安装 eslint');
  }
  if (result.error !== undefined) {
    throw new Error(`eslint 无法启动：${result.error.message}`);
  }
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`eslint 退出码 ${result.status}：${result.stderr.trim()}`);
  }
  return JSON.parse(result.stdout || '[]');
};

const toFindings = (results, cwd) => {
  return results.flatMap((result) => {
    const file = result.filePath.startsWith(cwd) ? result.filePath.slice(cwd.length + 1) : result.filePath;
    return result.messages.map((message) => ({
      ruleId: message.ruleId ?? 'std/eslint',
      level: message.severity === 2 ? 'error' : 'warning',
      file,
      line: message.line,
      message: `${message.message}${message.ruleId === null ? '' : ` (${message.ruleId})`}`,
      ...(message.fix === undefined ? {} : { fix: `eslint --fix ${file}` }),
    }));
  });
};

export const checkLint = ({ files, cwd }) => {
  if (files.length === 0) {
    return [];
  }
  return toFindings(run(files, cwd), cwd);
};
