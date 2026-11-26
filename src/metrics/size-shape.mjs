// 规模与结构度量：圈复杂度、代码深度、函数行数、条件子项数。
// 口径与 tools/eslint-plugin-aigc 的 cmetrics-complexity、function-lines、max-conditionals 对齐。
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { metricResult } from '../sarif.mjs';

const requireModule = createRequire(import.meta.url);

export const METRIC_NAMES = {
  complexity: '圈复杂度',
  depth: '代码深度',
  'function-lines': '函数行数',
  'condition-width': '条件子项数',
};

export const METRIC_UNITS = {
  complexity: '个判定点',
  depth: '层',
  'function-lines': '行',
  'condition-width': '个子条件',
};

const loadTypeScript = () => {
  try {
    return requireModule('typescript');
  } catch {
    throw new Error('缺少 typescript 执行器：ts/js 度量需要项目安装 typescript');
  }
};

const LOGICAL_ASSIGN_OPERATORS = new Set(['AmpersandAmpersandEqualsToken', 'BarBarEqualsToken', 'QuestionQuestionEqualsToken']);

/** 与 ESLint max-depth 一致：else if 不额外增加一层，with 语句计入。 */
const isDepthBlock = (ts, node) => {
  if (ts.isIfStatement(node)) {
    return !ts.isIfStatement(node.parent);
  }
  return (
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isSwitchStatement(node) ||
    ts.isTryStatement(node) ||
    ts.isWithStatement(node)
  );
};

const operatorKind = (ts, binary) => {
  return ts.SyntaxKind[binary.operatorToken.kind];
};

/** 单个语法节点对 cmetrics 圈复杂度的增量。 */
const isComplexityDecision = (ts, node) => {
  return (
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isCatchClause(node) ||
    ts.isCaseClause(node) ||
    ts.isDefaultClause(node)
  );
};

const increment = (ts, node, inReturn) => {
  if (ts.isIfStatement(node)) {
    return node.elseStatement !== undefined && !ts.isIfStatement(node.elseStatement) ? 2 : 1;
  }
  if (isComplexityDecision(ts, node)) {
    return 1;
  }
  if (ts.isConditionalExpression(node)) {
    return 1;
  }
  if (ts.isBinaryExpression(node)) {
    const kind = operatorKind(ts, node);
    if (kind === 'AmpersandAmpersandToken') {
      return inReturn ? 0 : 1;
    }
    if (kind === 'BarBarToken' || kind === 'QuestionQuestionToken') {
      return 1;
    }
    return LOGICAL_ASSIGN_OPERATORS.has(kind) ? 1 : 0;
  }
  if (node.questionDotToken !== undefined && (ts.isPropertyAccessExpression(node) || ts.isCallExpression(node))) {
    return 1;
  }
  return 0;
};

/** 按 cmetrics 口径：嵌套回调计入外层，命名方法整体计数。 */
export const complexityOf = (ts, root) => {
  let total = 1;
  const walk = (node, inReturn) => {
    if (node !== root) {
      total += increment(ts, node, inReturn);
    }
    const childInReturn = inReturn || ts.isReturnStatement(node);
    ts.forEachChild(node, (child) => walk(child, childInReturn));
  };
  walk(root, false);
  return total;
};

/** 代码深度：控制块最大嵌套层数。 */
export const depthOf = (ts, root) => {
  let max = 0;
  const walk = (node, depth) => {
    const next = isDepthBlock(ts, node) ? depth + 1 : depth;
    if (next > max) {
      max = next;
    }
    ts.forEachChild(node, (child) => {
      if (!ts.isFunctionLike(child)) {
        walk(child, next);
      }
    });
  };
  walk(root, 0);
  return max;
};

/** 去掉嵌套函数与注释后，统计整段函数（含参数与注解）的非空行数。 */
export const ownCodeLines = (ts, node, text) => {
  const nested = [];
  const collect = (child) => {
    ts.forEachChild(child, (item) => {
      if (ts.isFunctionLike(item)) {
        nested.push([item.getStart(), item.end]);
        return;
      }
      collect(item);
    });
  };
  collect(node);
  const start = node.getStart();
  let output = text.slice(start, node.end);
  for (const [from, to] of nested.sort((left, right) => right[0] - left[0])) {
    output = `${output.slice(0, from - start)}${output.slice(to - start)}`;
  }
  return stripComments(output)
    .split('\n')
    .filter((line) => line.trim().length > 0).length;
};

const stripComments = (source) => {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .split('\n')
    .map((line) => line.replace(/^[ \t]*\/\/[^/].*$/u, '').replace(/(?<!:)\/\/[^/].*$/u, ''))
    .join('\n');
};

/** 条件子项数：`!` 后接逻辑表达式时继续展开。 */
export const conditionWidth = (ts, node) => {
  if (node === undefined) {
    return 0;
  }
  if (ts.isBinaryExpression(node)) {
    const kind = operatorKind(ts, node);
    if (kind === 'AmpersandAmpersandToken' || kind === 'BarBarToken' || kind === 'QuestionQuestionToken') {
      return conditionWidth(ts, node.left) + conditionWidth(ts, node.right);
    }
    return 1;
  }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
    return conditionWidth(ts, node.operand);
  }
  return 1;
};

const conditionExpressionOf = (ts, node) => {
  if (ts.isForStatement(node)) {
    return node.condition;
  }
  if (ts.isIfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) {
    return node.expression;
  }
  if (ts.isConditionalExpression(node)) {
    return node.condition;
  }
  return undefined;
};

const conditionsOf = (ts, root) => {
  const conditions = [];
  const walk = (node) => {
    const condition = conditionExpressionOf(ts, node);
    if (condition !== undefined) {
      conditions.push(condition);
    }
    ts.forEachChild(node, walk);
  };
  walk(root);
  return conditions;
};

const keyTextOf = (ts, name) => {
  if (name === undefined) {
    return undefined;
  }
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return undefined;
};

/** 与 cmetrics-complexity 一致：只有能命名的方法才单独报告，匿名回调计入外层。 */
const nameOf = (ts, node) => {
  const own = keyTextOf(ts, node.name);
  if (own !== undefined) {
    return own;
  }
  const parent = node.parent;
  if (parent === undefined) {
    return undefined;
  }
  if (ts.isVariableDeclaration(parent) && parent.initializer === node) {
    return keyTextOf(ts, parent.name);
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    return keyTextOf(ts, parent.name);
  }
  if (ts.isPropertyDeclaration(parent) && parent.initializer === node) {
    return keyTextOf(ts, parent.name);
  }
  if (ts.isBinaryExpression(parent) && parent.right === node) {
    return keyTextOf(ts, parent.left);
  }
  return undefined;
};

const functionsOf = (ts, root) => {
  const functions = [];
  const walk = (node) => {
    if (ts.isFunctionLike(node) && nameOf(ts, node) !== undefined) {
      functions.push(node);
    }
    ts.forEachChild(node, walk);
  };
  walk(root);
  return functions;
};

/** 对单个文件计算全部指标值；返回值供 SARIF 判定与测试使用。 */
export const measureSource = (ts, text, file, kind = 'ts') => {
  const scriptKind = kind === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind);
  const metrics = [];
  for (const node of functionsOf(ts, source)) {
    const position = source.getLineAndCharacterOfPosition(node.getStart());
    const name = nameOf(ts, node);
    metrics.push({ metric: 'complexity', file, line: position.line + 1, name, value: complexityOf(ts, node) });
    metrics.push({ metric: 'depth', file, line: position.line + 1, name, value: depthOf(ts, node) });
    // 与 function-lines 规则一致：只统计块体函数，表达式体箭头不参与行数度量。
    if (node.body !== undefined && ts.isBlock(node.body)) {
      metrics.push({
        metric: 'function-lines',
        file,
        line: position.line + 1,
        name,
        value: ownCodeLines(ts, node, text),
      });
    }
  }
  for (const condition of conditionsOf(ts, source)) {
    const position = source.getLineAndCharacterOfPosition(condition.getStart());
    metrics.push({
      metric: 'condition-width',
      file,
      line: position.line + 1,
      name: '条件',
      value: conditionWidth(ts, condition),
    });
  }
  return metrics;
};

/** 把度量值转为 SARIF 结果；只输出超过阈值的结果，避免每个函数都产生噪声。 */
export const measureFiles = ({ files, thresholds, ids = Object.keys(METRIC_NAMES) }) => {
  const ts = loadTypeScript();
  const findings = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const kind = file.endsWith('.tsx') ? 'tsx' : 'ts';
    for (const item of measureSource(ts, text, file, kind)) {
      const threshold = thresholds[item.metric] ?? Number.POSITIVE_INFINITY;
      if (!ids.includes(item.metric) || item.value <= threshold) {
        continue;
      }
      findings.push(
        metricResult({
          ruleId: `std/metric:${item.metric}`,
          file,
          line: item.line,
          metric: item.metric,
          value: item.value,
          threshold,
          unit: METRIC_UNITS[item.metric],
          displayName: `${METRIC_NAMES[item.metric]}（${item.name}）`,
        }),
      );
    }
  }
  return findings;
};
