// 语言注册表：语言条目是唯一入口，能力缺失必须显式声明 unsupported。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const LANGUAGES_DIR = fileURLToPath(new URL('./languages/', import.meta.url));
const PROFILES_DIR = fileURLToPath(new URL('./profiles/', import.meta.url));

export const TASK_NAMES = ['format', 'lint', 'codecheck'];
export const METRIC_IDS = ['complexity', 'depth', 'function-lines', 'condition-width'];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`语言注册表不合法：${message}`);
  }
};

const readJson = (path) => {
  return JSON.parse(readFileSync(path, 'utf8'));
};

/** 校验一个任务条目：要么声明执行器，要么显式 unsupported 并给出原因。 */
export const assertTask = (task, label) => {
  assert(task !== undefined && task !== null, `${label} 缺省；未声明能力必须写成 unsupported`);
  if (task.state === 'unsupported') {
    assert(typeof task.reason === 'string' && task.reason.length > 0, `${label} 标为 unsupported 时必须给出 reason`);
    return;
  }
  assert(task.state === undefined, `${label} 的 state 只能是 unsupported`);
  assert(typeof task.engine === 'string' && task.engine.length > 0, `${label} 缺少 engine`);
};

const assertCodecheck = (codecheck, language) => {
  assert(typeof codecheck === 'object' && codecheck !== null, `${language} 缺少 codecheck`);
  // 缺陷可以复用同语言的 lint 结果（defect.from = lint），也可以单独声明执行器。
  if (codecheck.defect?.state !== 'unsupported') {
    assert(
      codecheck.defect?.from === 'lint' || typeof codecheck.defect?.engine === 'string',
      `${language} codecheck.defect 必须是 from: lint、独立 engine 或 unsupported`,
    );
  }
  if (codecheck.defect?.state === 'unsupported') {
    assert(codecheck.defect.reason !== undefined, `${language} codecheck.defect 标为 unsupported 时必须给出 reason`);
  }
  assertTask(codecheck.metrics, `${language} codecheck.metrics`);
  if (codecheck.metrics.state !== 'unsupported') {
    const ids = codecheck.metrics.ids ?? [];
    assert(
      ids.every((id) => METRIC_IDS.includes(id)),
      `${language} 的 metrics.ids 含未知指标`,
    );
  }
};

export const assertLanguage = (language) => {
  assert(typeof language.language === 'string', '缺少 language 标识');
  assert(Array.isArray(language.files) && language.files.length > 0, `${language.language} 缺少 files`);
  assertTask(language.format, `${language.language} format`);
  assertTask(language.lint, `${language.language} lint`);
  assertCodecheck(language.codecheck, language.language);
};

export const loadLanguages = (dir = LANGUAGES_DIR) => {
  const entries = readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(join(dir, name)));
  for (const language of entries) {
    assertLanguage(language);
  }
  const ids = entries.map((language) => language.language);
  assert(new Set(ids).size === ids.length, `语言标识重复：${ids.join(', ')}`);
  return entries;
};

export const loadProfile = (name = 'strict', dir = PROFILES_DIR) => {
  const profile = readJson(join(dir, `${name}.json`));
  assert(typeof profile.metrics === 'object', `${name} profile 缺少 metrics`);
  return profile;
};

/** 项目覆盖阈值只允许收紧：取两者中更严格的值。 */
export const effectiveThreshold = (packValue, projectValue) => {
  if (projectValue === undefined) {
    return packValue;
  }
  return Math.min(packValue, projectValue);
};

const REGEX_SPECIAL = /[.+^${}()|[\]\\]/u;
const ANY_SEGMENTS = '(?:[^/]+/)*';

/** 逐字符转换，避免占位符被后续替换改写；双星加斜杠表示任意层目录。 */
const globToRegExp = (glob) => {
  let body = '';
  let index = 0;
  while (index < glob.length) {
    if (glob.startsWith('**/', index)) {
      body += ANY_SEGMENTS;
      index += 3;
      continue;
    }
    if (glob.startsWith('**', index)) {
      body += '.*';
      index += 2;
      continue;
    }
    const char = glob[index];
    if (char === '*') {
      body += '[^/]*';
    } else if (char === '?') {
      body += '[^/]';
    } else {
      body += REGEX_SPECIAL.test(char) ? `\\${char}` : char;
    }
    index += 1;
  }
  return new RegExp(`^${body}$`, 'u');
};

/** 文件只归属一个语言；未命中时返回 undefined，由调用方按缺省语言报错。 */
export const resolveLanguage = (languages, file) => {
  const normalized = file.replace(/\\/gu, '/').replace(/^\.\//u, '');
  const matches = languages.filter((language) => language.files.some((glob) => globToRegExp(glob).test(normalized)));
  if (matches.length > 1) {
    throw new Error(`文件 ${normalized} 命中多个语言：${matches.map((m) => m.language).join(', ')}`);
  }
  return matches[0];
};

/** 能力矩阵：语言 × 任务的执行器或 unsupported。 */
export const capabilityMatrix = (languages) => {
  return languages.map((language) => ({
    language: language.language,
    format: language.format,
    lint: language.lint,
    defect: language.codecheck.defect,
    metrics: language.codecheck.metrics,
  }));
};
