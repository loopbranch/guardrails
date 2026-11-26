// Prettier 执行器：缺失时明确失败，不降级为 unsupported。
import { spawnSync } from 'node:child_process';
import { resolveBinary } from './binary.mjs';

export const PRETTIER_RULE = 'std/format';

const run = (args, cwd) => {
  const result = spawnSync(resolveBinary('prettier', cwd), args, { cwd, encoding: 'utf8' });
  if (result.error !== undefined && result.error.code === 'ENOENT') {
    throw new Error('缺少 prettier 执行器：请在项目中安装 prettier');
  }
  if (result.error !== undefined) {
    throw new Error(`prettier 无法启动：${result.error.message}`);
  }
  return result;
};

const toFindings = (files) => {
  return files
    .filter((file) => file.length > 0)
    .map((file) => ({
      ruleId: PRETTIER_RULE,
      level: 'error',
      file,
      message: '文件格式与 Prettier 输出不一致，运行固定命令可自动修复',
      fix: `prettier --write ${file}`,
    }));
};

/** 检查文件格式；返回 SARIF 缺陷项，不修改文件。 */
export const checkFormat = ({ files, cwd }) => {
  if (files.length === 0) {
    return [];
  }
  const result = run(['--list-different', ...files], cwd);
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`prettier 退出码 ${result.status}：${result.stderr.trim()}`);
  }
  return toFindings(result.stdout.split('\n').map((line) => line.trim()));
};

/** 修复文件格式。 */
export const writeFormat = ({ files, cwd }) => {
  if (files.length === 0) {
    return;
  }
  const result = run(['--write', ...files], cwd);
  if (result.status !== 0) {
    throw new Error(`prettier 修复失败：${result.stderr.trim()}`);
  }
};
