/**
 * no-repo-class-selector：e2e 不得按本仓 CSS 类名定位元素（control/rules/testing.md 第 3 节）。
 * CSS Modules 迁移后本仓类名会被哈希，按类名写的选择器会静默失效；改用 getByRole、getByTestId 或 data 属性。
 *
 * 类名清单取自 `styleRoots` 下的 .css/.scss 选择器；`.ant-*`、`.anticon*` 属于 antd，不在清单内。
 * antd 内部类名（`.ant-*`、`.anticon*`）同样禁止用于定位：它们是组件实现细节，改用可访问名称或 data-testid。
 * 只检查字符串与模板字符串中「像选择器」的写法：类名前是开头、空白、组合符、`(`、`[`、`,`、`]`、`)` 或 HTML 标签名。
 */
import fs from 'node:fs';
import path from 'node:path';

const STYLE_FILE = /\.(?:css|scss)$/;
const THIRD_PARTY_CLASS = /^(?:ant-|anticon)/;
const TAGS =
  'a|article|aside|button|canvas|div|footer|form|h[1-6]|header|img|input|label|li|main|nav|ol|option|p|section|select|span|svg|table|td|textarea|th|tr|ul|video|audio';
const COMPOUND = new RegExp(`(?:^|[\\s>+~,(\\[\\])]|(?<=^|[\\s>+~,(])(?:${TAGS}))((?:\\.-?[_a-zA-Z][\\w-]*)+)`, 'g');
const CLASS_IN_SELECTOR = /\.(?<className>-?[_a-zA-Z][\w-]*)/g;
/** 选择器写法中的 antd 类名：`.ant-*` 或 `.anticon*`，前面不是标识符字符（排除 `foo.ant-x` 一类属性访问或文件名）。 */
const ANTD_SELECTOR = /(?:^|[^\w$])\.(?:ant-|anticon)[\w-]*/;

const cache = new Map();

const walk = (dir, files) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
      continue;
    }
    if (STYLE_FILE.test(entry.name)) {
      files.push(full);
    }
  }
};

/**
 * 只取选择器部分：去掉注释后按 `{`、`}`、`;` 切分，紧跟 `{` 的片段是选择器或 at 规则前导，
 * 其余是声明，跳过，避免把 `.5s`、`url(a.png)` 一类值当成类名。
 */
export const classNamesFromStyles = (source) => {
  const parts = source.replace(/\/\*[\s\S]*?\*\//g, '').split(/(?<delimiter>[{};])/);
  const names = new Set();
  for (let index = 0; index + 1 < parts.length; index += 2) {
    if (parts[index + 1] !== '{') {
      continue;
    }
    for (const match of parts[index].matchAll(CLASS_IN_SELECTOR)) {
      if (!THIRD_PARTY_CLASS.test(match.groups.className)) {
        names.add(match.groups.className);
      }
    }
  }
  return names;
};

const repoClassNames = (cwd, styleRoots) => {
  const key = `${cwd}\0${styleRoots.join('\0')}`;
  if (!cache.has(key)) {
    const files = [];
    for (const root of styleRoots) {
      const dir = path.resolve(cwd, root);
      if (fs.existsSync(dir)) {
        walk(dir, files);
      }
    }
    const names = new Set();
    for (const file of files) {
      for (const name of classNamesFromStyles(fs.readFileSync(file, 'utf8'))) {
        names.add(name);
      }
    }
    cache.set(key, names);
  }
  return cache.get(key);
};

/** 返回文本中以选择器写法出现、且属于 `classNames` 的类名（按出现顺序去重）。 */
export const repoClassSelectors = (text, classNames) => {
  const found = [];
  for (const compound of text.matchAll(COMPOUND)) {
    for (const match of compound[1].matchAll(CLASS_IN_SELECTOR)) {
      if (classNames.has(match.groups.className) && !found.includes(match.groups.className)) {
        found.push(match.groups.className);
      }
    }
  }
  return found;
};

/** 文本中是否以选择器写法出现 antd 类名。 */
export const hasAntdSelector = (text) => {
  return ANTD_SELECTOR.test(text);
};

/** @type {import('eslint').Rule.RuleModule} */
export const noRepoClassSelector = {
  meta: {
    type: 'problem',
    docs: { description: 'e2e 不得按本仓 CSS 类名定位元素' },
    messages: {
      forbidden: 'e2e 不得按本仓 CSS 类名 .{{name}} 定位（CSS Modules 迁移后类名会被哈希）：改用 getByRole、getByTestId 或 data 属性。',
      antd: 'e2e 不得按 antd 内部类名（.ant-*、.anticon*）定位：改用 getByRole、可访问名称或 data-testid。',
    },
    schema: [
      {
        type: 'object',
        properties: {
          styleRoots: { type: 'array', items: { type: 'string' }, minItems: 1 },
          classNames: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const classNames = options.classNames
      ? new Set(options.classNames)
      : repoClassNames(context.cwd, options.styleRoots ?? ['apps/aigc-web/src', 'pkgs']);
    const check = (node, text) => {
      for (const name of repoClassSelectors(text, classNames)) {
        context.report({ node, messageId: 'forbidden', data: { name } });
      }
      if (hasAntdSelector(text)) {
        context.report({ node, messageId: 'antd' });
      }
    };
    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          check(node, node.value);
        }
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};
