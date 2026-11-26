/**
 * G.AST.03-TS：用可选链 `?.` 替代非空判断。
 * 覆盖 `x && x.foo`、`x !== null && x.foo`、`x != undefined && x.foo()` 等平台会报的写法；
 * typescript-eslint 的官方规则只在“可安全自动改写”时报，这里按平台口径补齐。
 */
const baseObjectName = (node) => {
  let current = node;
  while (current !== null && current !== undefined) {
    if (current.type === 'Identifier') {
      return current.name;
    }
    if (current.type === 'MemberExpression') {
      current = current.object;
      continue;
    }
    if (current.type === 'CallExpression') {
      current = current.callee;
      continue;
    }
    return undefined;
  }
  return undefined;
};

const nullTestName = (node) => {
  if (node.type !== 'BinaryExpression' || !['!==', '!=', '===', '=='].includes(node.operator)) {
    return undefined;
  }
  const left = node.left;
  const right = node.right;
  const isNullish = (value) => value.type === 'Literal' && value.value === null;
  const isUndefined = (value) => value.type === 'Identifier' && value.name === 'undefined';
  if (left.type === 'Identifier' && (isNullish(right) || isUndefined(right))) {
    return left.name;
  }
  return undefined;
};

const chainName = (node) => {
  if (node.type === 'LogicalExpression' && node.operator === '&&') {
    return chainName(node.left);
  }
  if (node.type === 'Identifier') {
    return node.name;
  }
  return nullTestName(node);
};

const objectName = (node) => {
  if (node.type !== 'MemberExpression' && node.type !== 'CallExpression') {
    return undefined;
  }
  return baseObjectName(node);
};

const objectNameWithUnary = (node) => {
  if (node.type === 'UnaryExpression' && node.operator === '!') {
    return objectNameWithUnary(node.argument);
  }
  return objectName(node);
};

export const preferOptionalChainStrict = {
  meta: {
    type: 'suggestion',
    docs: { description: '用可选链替代非空判断' },
    schema: [],
    messages: { optional: '这里可以改用可选链 `?.`：`{{name}} && {{name}}.…` 或 `{{name}} !== null && …`。' },
  },
  create(context) {
    return {
      LogicalExpression(node) {
        if (node.operator !== '&&') {
          return;
        }
        // 三元里直接返回同名值：`x && x.a && !x.b ? x : other` → `x?.a && !x?.b ? x : other`
        const parent = node.parent;
        const ternaryValue =
          parent?.type === 'ConditionalExpression' && parent.test === node && parent.consequent.type === 'Identifier'
            ? parent.consequent.name
            : undefined;
        if (ternaryValue !== undefined) {
          if (chainName(node.left) === ternaryValue && objectNameWithUnary(node.right) === ternaryValue) {
            context.report({ node, messageId: 'optional', data: { name: ternaryValue } });
          }
          return;
        }
        if (parent?.type === 'LogicalExpression') {
          return;
        }
        const leftName = chainName(node.left);
        if (leftName === undefined) {
          return;
        }
        if (objectName(node.right) === leftName) {
          context.report({ node, messageId: 'optional', data: { name: leftName } });
        }
      },
    };
  },
};
