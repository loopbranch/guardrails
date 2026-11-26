// 任务编排：按语言分组文件，缺失能力输出 unsupported，未归属文件直接报错。
import { checkLint as eslintLint } from './engines/eslint.mjs';
import { checkFormat as prettierCheck } from './engines/prettier.mjs';
import { checkLint as stylelintLint } from './engines/stylelint.mjs';
import { checkFormat as sqlfluffFormat, checkLint as sqlfluffLint } from './engines/sqlfluff.mjs';
import { measureFiles } from './metrics/size-shape.mjs';
import { effectiveThreshold, loadLanguages, loadProfile, resolveLanguage } from './registry.mjs';

export const groupByLanguage = (languages, files) => {
  const groups = new Map();
  const unassigned = [];
  for (const file of files) {
    const language = resolveLanguage(languages, file);
    if (language === undefined) {
      unassigned.push(file);
      continue;
    }
    const group = groups.get(language.language) ?? [];
    group.push(file);
    groups.set(language.language, group);
  }
  if (unassigned.length > 0) {
    throw new Error(`以下文件没有归属任何语言，请在注册表中补充语言条目：\n${unassigned.join('\n')}`);
  }
  return groups;
};

const unsupportedEntry = (language, task) => {
  return { language: language.language, task, reason: language[task].reason };
};

const lintByEngine = (engine, { files, cwd, dialect }) => {
  if (engine === 'eslint') {
    return eslintLint({ files, cwd });
  }
  if (engine === 'stylelint') {
    return stylelintLint({ files, cwd });
  }
  if (engine === 'sqlfluff') {
    return sqlfluffLint({ files, cwd, dialect });
  }
  throw new Error(`未知的 lint 执行器：${engine}`);
};

const formatByEngine = (engine, { files, cwd, dialect }) => {
  if (engine === 'prettier') {
    return prettierCheck({ files, cwd });
  }
  if (engine === 'sqlfluff') {
    return sqlfluffFormat({ files, cwd, dialect });
  }
  throw new Error(`未知的 format 执行器：${engine}`);
};

const taskEntry = (language, task) => {
  return language[task];
};

export const runTask = ({ languages, task, files, cwd }) => {
  const groups = groupByLanguage(languages, files);
  const findings = [];
  const skipped = [];
  for (const [languageId, groupFiles] of groups) {
    const language = languages.find((entry) => entry.language === languageId);
    const entry = taskEntry(language, task);
    if (entry.state === 'unsupported') {
      skipped.push(unsupportedEntry(language, task));
      continue;
    }
    const engine = task === 'format' ? formatByEngine : lintByEngine;
    findings.push(...engine(entry.engine, { files: groupFiles, cwd, dialect: entry.dialect }));
  }
  return { findings, skipped };
};

/** 度量任务：按语言声明的指标与阈值计算，缺少该能力的语言输出 unsupported。 */
export const runMetrics = ({ languages: registry, files, profile = 'strict', overrides = {} }) => {
  const groups = groupByLanguage(registry, files);
  const findings = [];
  const skipped = [];
  for (const [languageId, groupFiles] of groups) {
    const language = registry.find((entry) => entry.language === languageId);
    const metrics = language.codecheck.metrics;
    if (metrics.state === 'unsupported') {
      skipped.push({ language: languageId, task: 'metrics', reason: metrics.reason });
      continue;
    }
    if (metrics.engine !== 'size-shape') {
      throw new Error(`未知的度量执行器：${metrics.engine}`);
    }
    const thresholds = metricsThresholds(profile, languageId, overrides);
    findings.push(...measureFiles({ files: groupFiles, thresholds, ids: metrics.ids }));
  }
  return { findings, skipped };
};

export const metricsThresholds = (profileName, languageId, overrides = {}) => {
  const profile = loadProfile(profileName);
  const packValues = profile.metrics[languageId] ?? {};
  return Object.fromEntries(Object.entries(packValues).map(([metric, value]) => [metric, effectiveThreshold(value, overrides[metric])]));
};

export const languages = () => loadLanguages();
