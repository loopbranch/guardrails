/**
 * 平台 cmetrics 圈复杂度口径（CodeCheck `cyclomatic_complexity_total` 的方法级判定）。
 *
 * 与 ESLint 内置 `complexity` 的差异（见 issue #148 的 40 个平台值校准）：
 * - `else` 计入：纯 `else` +1；`else if` 整体 +1（不拆成 else + if）；
 * - `??` 计入（平台实际值验证；不计会漏掉平台超标函数）；
 * - 嵌套回调计入外层命名方法，方法级阈值仍为 20；
 * - 只报告命名方法；匿名内联回调作为外层方法的一部分，不单独报告。
 *
 * 本地计数刻意不弱于平台：校准样本上本地均 ≥ 平台值，宁可多降、不漏报。
 */
const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const LOOP_TYPES = new Set(['ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement']);
const LOGICAL_ASSIGN_OPERATORS = new Set(['&&=', '||=', '??=']);

const identifierName = (node) => {
  return node?.type === 'Identifier' ? node.name : null;
};

const keyName = (key) => {
  if (!key) {
    return null;
  }
  if (key.type === 'Identifier') {
    return key.name;
  }
  if (key.type === 'Literal') {
    return String(key.value);
  }
  return null;
};

const assignmentTargetName = (left) => {
  if (!left) {
    return null;
  }
  if (left.type === 'Identifier') {
    return left.name;
  }
  if (left.type === 'MemberExpression' && !left.computed) {
    return keyName(left.property);
  }
  return null;
};

const parentMethodName = (parent, node) => {
  if (parent.type === 'MethodDefinition') {
    return parent.value === node ? keyName(parent.key) : null;
  }
  if (parent.type === 'PropertyDefinition' || parent.type === 'Property') {
    return parent.value === node ? keyName(parent.key) : null;
  }
  if (parent.type === 'VariableDeclarator') {
    return parent.init === node ? identifierName(parent.id) : null;
  }
  if (parent.type === 'AssignmentExpression') {
    return parent.right === node ? assignmentTargetName(parent.left) : null;
  }
  return null;
};

/** 返回命名方法的名称；匿名回调或无法命名的函数返回 null。 */
const methodName = (node) => {
  if (node.type === 'FunctionDeclaration') {
    return identifierName(node.id);
  }
  // `register(function handler() {})` 这类显式命名函数表达式也应单独报告。
  if (node.type === 'FunctionExpression' && node.id) {
    return identifierName(node.id);
  }
  if (!node.parent) {
    return null;
  }
  return parentMethodName(node.parent, node);
};

const logicalIncrement = (node, inReturn) => {
  if (node.operator === '&&') {
    return inReturn ? 0 : 1;
  }
  return node.operator === '||' || node.operator === '??' ? 1 : 0;
};

/** 单个 AST 节点对方法圈复杂度的增量。 */
const increment = (node, inReturn) => {
  if (node.type === 'IfStatement') {
    return 1 + (node.alternate && node.alternate.type !== 'IfStatement' ? 1 : 0);
  }
  if (LOOP_TYPES.has(node.type) || node.type === 'CatchClause' || node.type === 'SwitchCase') {
    return 1;
  }
  if (node.type === 'ConditionalExpression') {
    return 1;
  }
  if (node.type === 'LogicalExpression') {
    return logicalIncrement(node, inReturn);
  }
  if (node.type === 'AssignmentExpression') {
    return LOGICAL_ASSIGN_OPERATORS.has(node.operator) ? 1 : 0;
  }
  if ((node.type === 'MemberExpression' || node.type === 'CallExpression') && node.optional === true) {
    return 1;
  }
  return 0;
};

/** 按平台口径统计算方法及其嵌套回调的圈复杂度。 */
const countComplexity = (root, visitorKeys) => {
  let complexity = 1;

  const visit = (node, inReturn) => {
    // 嵌套函数内部的 return 语义独立；其外层即使位于 return 表达式内，内部 && 仍按自身 return 规则计算。
    const nested = node !== root && FUNCTION_TYPES.has(node.type);
    const returnContext = nested ? false : inReturn;
    if (node !== root) {
      complexity += increment(node, returnContext);
    }
    const childReturn = returnContext || node.type === 'ReturnStatement';
    for (const key of visitorKeys[node.type] ?? []) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item?.type) {
            visit(item, childReturn);
          }
        }
        continue;
      }
      if (child?.type) {
        visit(child, childReturn);
      }
    }
  };

  visit(root, false);
  return complexity;
};

export const cmetricsComplexity = {
  meta: {
    type: 'suggestion',
    docs: { description: '按平台 cmetrics 口径限制单个方法的圈复杂度' },
    schema: [{ type: 'integer', minimum: 1 }],
    messages: {
      complex: "方法 '{{name}}' 的 cmetrics 圈复杂度为 {{complexity}}，最多允许 {{max}}。",
    },
  },
  create(context) {
    const visitorKeys = context.sourceCode.visitorKeys;
    const max = context.options[0] ?? 20;

    const check = (node) => {
      const name = methodName(node);
      if (!name) {
        return;
      }
      const complexity = countComplexity(node, visitorKeys);
      if (complexity > max) {
        context.report({ node, messageId: 'complex', data: { name, complexity, max } });
      }
    };

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
};
