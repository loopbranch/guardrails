/**
 * G.TYP.15：其它类型转数字使用 Number()，并显式检查返回值是否为 NaN。
 * - 禁止 parseInt / parseFloat；
 * - Number(...) 的结果赋给变量后，同一函数内必须出现 isNaN / Number.isNaN 检查；
 *   isFinite / Number.isFinite 与 Number.isInteger 是更严格的前置判断（NaN、Infinity 与非整数都被拒绝），同样满足该口径。
 */
const BANNED = new Set(['parseInt', 'parseFloat']);
const NAN_CHECKS = new Set(['isNaN', 'isFinite', 'isInteger']);
const SKIP_FILE = /(?:(?:^|[\\/])e2e[\\/]|\.(?:test|spec)\.)/u;

const nameOfCallee = (callee) => {
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression' && !callee.computed) {
    return callee.property?.name;
  }
  return undefined;
};

const checkedInScope = (functionNode, identifierName) => {
  let checked = false;
  const visit = (node) => {
    if (node === null || node === undefined || typeof node !== 'object' || checked) {
      return;
    }
    if (
      node.type === 'CallExpression' &&
      NAN_CHECKS.has(nameOfCallee(node.callee)) &&
      node.arguments.some((argument) => argument.type === 'Identifier' && argument.name === identifierName)
    ) {
      checked = true;
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') {
        continue;
      }
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else {
        visit(value);
      }
    }
  };
  visit(functionNode);
  return checked;
};

const nearestFunction = (node) => {
  let current = node;
  while (current !== null && current !== undefined) {
    if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(current.type)) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
};

export const numberConversion = {
  meta: {
    type: 'suggestion',
    docs: { description: '转数字使用 Number() 并检查 NaN' },
    schema: [],
    messages: {
      banned: '禁止使用 {{name}}；请改用 Number() 并在使用前检查 NaN。',
      unchecked: 'Number() 的结果 {{name}} 没有用 isNaN、isFinite 或 Number.isInteger 检查过。',
    },
  },
  create(context) {
    if (SKIP_FILE.test(context.filename)) {
      return {};
    }
    return {
      CallExpression(node) {
        const name = nameOfCallee(node.callee);
        if (BANNED.has(name)) {
          context.report({ node, messageId: 'banned', data: { name } });
          return;
        }
        if (name !== 'Number') {
          return;
        }
        const parent = node.parent;
        if (parent?.type !== 'VariableDeclarator' || parent.id.type !== 'Identifier') {
          return;
        }
        const owner = nearestFunction(node) ?? context.sourceCode.ast;
        if (!checkedInScope(owner, parent.id.name)) {
          context.report({ node, messageId: 'unchecked', data: { name: parent.id.name } });
        }
      },
    };
  },
};
