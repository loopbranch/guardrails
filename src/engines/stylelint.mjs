// stylelint 执行器：SCSS 语言的缺陷来源；缺失时明确失败。
import { spawnSync } from 'node:child_process';
import { resolveBinary } from './binary.mjs';

const run = (args, cwd) => {
  const result = spawnSync(resolveBinary('stylelint', cwd), ['--formatter', 'json', '--allow-empty-input', ...args], {
    cwd,
    encoding: 'utf8',
  });
  if (result.error?.code === 'ENOENT') {
    throw new Error('缺少 stylelint 执行器：请在项目中安装 stylelint');
  }
  if (result.error !== undefined) {
    throw new Error(`stylelint 无法启动：${result.error.message}`);
  }
  if (result.status !== 0 && result.status !== 2) {
    throw new Error(`stylelint 退出码 ${result.status}：${result.stderr.trim()}`);
  }
  return JSON.parse(result.stdout || '[]');
};

const toFindings = (reports, cwd) => {
  return reports.flatMap((report) => {
    const file = report.source.startsWith(cwd) ? report.source.slice(cwd.length + 1) : report.source;
    return report.warnings.map((warning) => ({
      ruleId: `std/scss:${warning.rule}`,
      level: warning.severity === 'error' ? 'error' : 'warning',
      file,
      line: warning.line,
      message: warning.text,
      ...(warning.fix === undefined ? {} : { fix: `stylelint --fix ${file}` }),
    }));
  });
};

export const checkLint = ({ files, cwd }) => {
  if (files.length === 0) {
    return [];
  }
  return toFindings(run(files, cwd), cwd);
};
