// step 公共入口：解析文件，运行任务，输出 SARIF，按三态设置退出码。
import process from 'node:process';
import { changedFiles } from '../changed.mjs';
import { loadLanguages, resolveLanguage } from '../registry.mjs';
import { runMetrics, runTask } from '../run.mjs';
import { buildSarif, verdictOf } from '../sarif.mjs';

const TOOL = { name: '@fantasticit/sumi-standards', version: '0.0.0' };
const TASKS = ['format', 'lint', 'codecheck'];

const filesFromArgs = (argv) => {
  return argv.filter((item) => !item.startsWith('--'));
};

const baseFromArgs = (argv) => {
  const index = argv.indexOf('--base');
  return index === -1 ? 'HEAD' : argv[index + 1];
};

const collect = ({ task, files, cwd }) => {
  const languages = loadLanguages();
  if (task !== 'codecheck') {
    return runTask({ languages, task, files, cwd });
  }
  const defect = runTask({ languages, task: 'lint', files, cwd });
  const metrics = runMetrics({ languages, files });
  return {
    findings: [...defect.findings, ...metrics.findings],
    skipped: [...defect.skipped, ...metrics.skipped],
  };
};

export const runStep = (task) => {
  if (!TASKS.includes(task)) {
    throw new Error(`未知任务：${task}`);
  }
  const argv = process.argv.slice(2);
  const cwd = process.cwd();
  const targets = filesFromArgs(argv);
  const candidates = targets.length > 0 ? targets : changedFiles({ cwd, base: baseFromArgs(argv) });
  // 步骤层只处理已声明语言的文件；其它改动（.gitmodules、图片、文档目录）由各自门禁负责。
  const files = candidates.filter((file) => resolveLanguage(loadLanguages(), file) !== undefined);
  if (files.length === 0) {
    process.stdout.write('结论：skip（没有已声明语言的文件）\n');
    return;
  }
  const { findings, skipped } = collect({ task, files, cwd });
  const sarif = buildSarif({ toolName: TOOL.name, toolVersion: TOOL.version, findings, skipped });
  process.stdout.write(`${JSON.stringify(sarif)}\n`);
  const verdict = verdictOf({ findings, unsupported: skipped.length > 0 && skipped.length === files.length });
  process.stdout.write(`结论：${verdict}\n`);
  process.exitCode = verdict === 'fail' ? 1 : 0;
};
