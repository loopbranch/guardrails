/**
 * G.TYP.09：不要在数组遍历中增删其元素。
 * 检查 forEach/map/filter/some/every/reduce 回调体里对同一数组表达式的 push/splice/shift/pop/unshift。
 */
const ITERATION_METHODS = new Set(['forEach', 'map', 'filter', 'some', 'every', 'reduce', 'reduceRight', 'flatMap']);
const MUTATING_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']);
const SKIP_FILE = /(?:[\\/]e2e[\\/]|\.(?:test|spec)\.)/u;

const receiverName = (node) => {
  const callee = node.callee;
  if (callee.type !== 'MemberExpression' || callee.computed) {
    return undefined;
  }
  if (callee.object.type === 'Identifier') {
    return callee.object.name;
  }
  if (callee.object.type === 'MemberExpression' && callee.object.property?.name !== undefined) {
    return callee.object.property.name;
  }
  return undefined;
};

const collectMutations = (root) => {
  const mutations = [];
  const visit = (node) => {
    if (node === null || node === undefined || typeof node !== 'object') {
      return;
    }
    if (node.type === 'CallExpression' && MUTATING_METHODS.has(node.callee?.property?.name) && receiverName(node) !== undefined) {
      mutations.push(receiverName(node));
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
  visit(root);
  return mutations;
};

export const noArrayMutationInIteration = {
  meta: {
    type: 'problem',
    docs: { description: '禁止在数组遍历中增删同一数组的元素' },
    schema: [],
    messages: { mutate: '遍历 {{name}} 时不要增删它的元素；先复制或构造新数组。' },
  },
  create(context) {
    if (SKIP_FILE.test(context.filename)) {
      return {};
    }
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || !ITERATION_METHODS.has(callee.property?.name)) {
          return;
        }
        const name = receiverName(node);
        const callback = node.arguments[0];
        if (name === undefined || callback === undefined) {
          return;
        }
        if (collectMutations(callback).includes(name)) {
          context.report({ node, messageId: 'mutate', data: { name } });
        }
      },
    };
  },
};
