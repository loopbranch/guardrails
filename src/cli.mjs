// CLI：list 查看能力矩阵；check 对指定语言或改动文件运行单项任务。
import process from 'node:process';
import { changedFiles } from './changed.mjs';
import { capabilityMatrix, loadLanguages, resolveLanguage } from './registry.mjs';
import { runTask } from './run.mjs';
import { buildSarif, verdictOf } from './sarif.mjs';

const TOOL = { name: '@fantasticit/sumi-standards', version: '0.0.0' };

const write = (text) => {
  process.stdout.write(`${text}\n`);
};

const parseArgs = (argv) => {
  const [command, ...rest] = argv;
  const flags = {};
  const files = [];
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const value = rest[index + 1];
      if (value !== undefined && !value.startsWith('--')) {
        flags[key] = value;
        index += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }
    files.push(item);
  }
  return { command, flags, files };
};

const listCommand = () => {
  const languages = loadLanguages();
  write(JSON.stringify(capabilityMatrix(languages), null, 2));
};

const filterByLanguage = (languages, files, language) => {
  const matcher = languages.find((entry) => entry.language === language);
  if (matcher === undefined) {
    throw new Error(`未知语言：${language}；可用语言见 standards list`);
  }
  return files.filter((file) => resolveLanguage(languages, file)?.language === language);
};

const formatSarif = (sarif, output) => {
  return output === 'compact' ? JSON.stringify(sarif) : JSON.stringify(sarif, null, 2);
};

const checkCommand = ({ flags, files }) => {
  const task = flags.task;
  if (!['format', 'lint', 'codecheck'].includes(task)) {
    throw new Error(
      '用法：standards check --task format|lint|codecheck [--language ts] [--base <ref>] [--output pretty|compact] [文件...]',
    );
  }
  const cwd = process.cwd();
  const languages = loadLanguages();
  const targets = files.length > 0 ? files : changedFiles({ cwd, base: flags.base ?? 'HEAD' });
  const scoped = typeof flags.language === 'string' ? filterByLanguage(languages, targets, flags.language) : targets;
  if (scoped.length === 0) {
    write(`结论：skip（没有 ${flags.language ?? '任何'} 语言的文件）`);
    return;
  }
  const { findings, skipped } = runTask({ languages, task, files: scoped, cwd });
  const verdict = verdictOf({ findings, unsupported: skipped.length > 0 && skipped.length === scoped.length });
  write(formatSarif(buildSarif({ toolName: TOOL.name, toolVersion: TOOL.version, findings, skipped }), flags.output));
  write(`结论：${verdict}`);
  process.exitCode = verdict === 'fail' ? 1 : 0;
};

export const main = (argv = process.argv.slice(2)) => {
  const { command, flags, files } = parseArgs(argv);
  if (command === 'list') {
    listCommand();
    return;
  }
  if (command === 'check') {
    checkCommand({ flags, files });
    return;
  }
  throw new Error('用法：standards list | standards check --task <format|lint|codecheck> [--language <语言>] [文件...]');
};
