// sqlfluff 执行器：SQL 语言的格式化与缺陷来源；缺 Python 或 sqlfluff 时明确失败。
import { spawnSync } from 'node:child_process';
import { resolveBinary } from './binary.mjs';

const run = (args, cwd) => {
  const result = spawnSync(resolveBinary('sqlfluff', cwd), args, { cwd, encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') {
    throw new Error('缺少 sqlfluff 执行器：请安装 Python 3 与 sqlfluff');
  }
  if (result.error !== undefined) {
    throw new Error(`sqlfluff 无法启动：${result.error.message}`);
  }
  if (![0, 1, 2].includes(result.status)) {
    throw new Error(`sqlfluff 退出码 ${result.status}：${result.stderr.trim()}`);
  }
  return result;
};

const toFindings = (reports) => {
  return reports.flatMap((report) => {
    return report.violations.map((violation) => ({
      ruleId: `std/sql:${violation.code}`,
      level: violation.warning === true ? 'warning' : 'error',
      file: report.filepath,
      line: violation.line_no,
      message: violation.description,
      fix: `sqlfluff fix --dialect postgres ${report.filepath}`,
    }));
  });
};

export const checkLint = ({ files, cwd, dialect = 'postgres' }) => {
  if (files.length === 0) {
    return [];
  }
  const result = run(['lint', '--format', 'json', '--dialect', dialect, ...files], cwd);
  const stdout = result.stdout.trim();
  return stdout.length === 0 ? [] : toFindings(JSON.parse(stdout));
};

export const checkFormat = ({ files, cwd, dialect = 'postgres' }) => {
  if (files.length === 0) {
    return [];
  }
  const result = run(['format', '--check', '--dialect', dialect, ...files], cwd);
  if (result.status === 0) {
    return [];
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.sql'))
    .map((file) => ({
      ruleId: 'std/format:sql',
      level: 'error',
      file,
      message: 'SQL 文件格式与 sqlfluff 输出不一致',
      fix: `sqlfluff format --dialect postgres ${file}`,
    }));
};
