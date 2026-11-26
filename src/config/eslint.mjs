// ESLint 配置装配：规则取值来自 rules/languages/<语言>/eslint-rules.json，格式类规则一律不启用。
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import aigcPlugin from '../eslint-plugin/index.mjs';

export const loadRules = (language) => {
  return JSON.parse(readFileSync(new URL(`../../rules/languages/${language}/eslint-rules.json`, import.meta.url), 'utf8'));
};

export const coreRules = (rules, thresholds = {}) => {
  return {
    ...rules.style,
    ...rules.codecheck,
    ...rules.typescript,
    complexity: ['error', thresholds.complexity ?? 20],
    'max-lines-per-function': ['error', { max: thresholds['function-lines'] ?? 100, skipComments: true, skipBlankLines: true }],
  };
};

const pluginBlock = {
  name: 'standards/plugin',
  plugins: { aigc: aigcPlugin },
  rules: { 'aigc/arrow-functions': 'error' },
};

const zeroExceptions = {
  name: 'standards/zero-exceptions',
  linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' },
};

const reactLane = (files) => {
  return {
    name: 'standards/react',
    files,
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...Object.fromEntries(Object.keys(reactHooks.configs['recommended-latest'].rules).map((name) => [name, 'error'])),
      'max-lines-per-function': ['error', { max: 100, skipComments: true, skipBlankLines: true }],
    },
  };
};

const webStyleLane = (files, entries) => {
  return {
    name: 'standards/web-style',
    files,
    plugins: { aigc: aigcPlugin },
    rules: {
      'aigc/css-module-same-name': 'error',
      ...(entries.length === 0 ? {} : { 'aigc/no-global-style-import': ['error', { entries }] }),
    },
  };
};

const testRules = (thresholds) => {
  return {
    'no-console': 'error',
    complexity: ['error', thresholds.complexity ?? 20],
    'aigc/cmetrics-complexity': ['error', thresholds.complexity ?? 20],
    'aigc/function-lines': ['error', { max: thresholds['function-lines'] ?? 100 }],
    'max-lines-per-function': 'off',
    'aigc/no-weak-test': 'error',
  };
};

const e2eRules = (rules, thresholds) => {
  return {
    ...rules.codecheck,
    'no-console': 'error',
    'aigc/function-lines': ['error', { max: thresholds['function-lines'] ?? 100 }],
    complexity: ['error', thresholds.complexity ?? 20],
    'aigc/cmetrics-complexity': ['error', thresholds.complexity ?? 20],
  };
};

const sourceRulesOf = ({ profile, rules, thresholds, cmetrics }) => {
  if (profile === 'test') {
    return testRules(thresholds);
  }
  if (profile === 'e2e') {
    return e2eRules(rules, thresholds);
  }
  return {
    ...coreRules(rules, thresholds),
    ...(cmetrics ? { 'aigc/cmetrics-complexity': ['error', thresholds.complexity ?? 20] } : {}),
  };
};

/** 生成某个语言的 ESLint 扁平配置；项目只需传入车道文件、全局变量、车道名与规则画像。 */
export const eslintConfig = ({
  language,
  files,
  environment,
  typeAware = false,
  thresholds = {},
  lanes = [],
  styleEntries = [],
  reactFiles = [],
  profile = 'core',
  cmetrics = true,
}) => {
  const rules = loadRules(language);
  const laneBlocks = {
    react: () => reactLane(reactFiles.length === 0 ? files : reactFiles),
    'web-style': () => webStyleLane(files, styleEntries),
  };
  return [
    zeroExceptions,
    js.configs.recommended,
    ...tseslint.configs.recommended,
    pluginBlock,
    { name: 'standards/strict', rules: rules.strict },
    {
      name: `standards/source:${language}`,
      files,
      languageOptions: { globals: environment },
      plugins: { aigc: aigcPlugin },
      rules: sourceRulesOf({ profile, rules, thresholds, cmetrics }),
    },
    ...(typeAware
      ? [
          {
            name: `standards/type-aware:${language}`,
            files,
            languageOptions: { parserOptions: { projectService: true } },
            rules: rules.typeAware,
          },
        ]
      : []),
    ...lanes.map((lane) => laneBlocks[lane]()),
  ];
};

export const nodeGlobals = globals.node;
export const browserGlobals = globals.browser;
export const es2021Globals = globals.es2021;
