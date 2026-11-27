/**
 * G.TYP.09：不要在数组遍历中增删其元素。
 * 覆盖数组方法回调、for…of 与按下标遍历的 for 循环；按完整成员链比较，避免把 `files` 与 `group.files` 当成同一数组。
 * 包含单元测试与 e2e；e2e 当前 0 命中，不保留目录例外。
 */
const ITERATION_METHODS = new Set(['forEach', 'map', 'filter', 'some', 'every', 'reduce', 'reduceRight', 'flatMap']);
const MUTATING_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']);

const chainOf = (node) => {
  if (node === null || node === undefined) {
    return undefined;
  }
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'ThisExpression') {
    return 'this';
  }
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    const object = chainOf(node.object);
    return object === undefined ? undefined : `${object}.${node.property.name}`;
  }
  return undefined;
};

const shownName = (chain) => chain.split('.').at(-1);

const mutationChains = (root) => {
  const chains = [];
  const visit = (node) => {
    if (node === null || node === undefined || typeof node !== 'object') {
      return;
    }
    if (node.type === 'CallExpression' && MUTATING_METHODS.has(node.callee?.property?.name)) {
      const chain = chainOf(node.callee.object);
      if (chain !== undefined) {
        chains.push(chain);
      }
    }
    if (node.type === 'AssignmentExpression' && node.left?.type === 'MemberExpression' && node.left.property?.name === 'length') {
      const chain = chainOf(node.left.object);
      if (chain !== undefined) {
        chains.push(chain);
      }
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
  return chains;
};

const indexedChain = (node) => {
  const test = node.test;
  if (test?.type !== 'BinaryExpression') {
    return undefined;
  }
  for (const side of [test.left, test.right]) {
    if (side?.type === 'MemberExpression' && !side.computed && side.property?.name === 'length') {
      const chain = chainOf(side.object);
      if (chain !== undefined) {
        return chain;
      }
    }
  }
  return undefined;
};

export const noArrayMutationInIteration = {
  meta: {
    type: 'problem',
    docs: { description: '禁止在数组遍历中增删同一数组的元素' },
    schema: [],
    messages: { mutate: '遍历 {{name}} 时不要增删它的元素；先复制或构造新数组。' },
  },
  create(context) {
    const reportIfMutated = (chain, body, node) => {
      if (chain !== undefined && body !== undefined && mutationChains(body).includes(chain)) {
        context.report({ node, messageId: 'mutate', data: { name: shownName(chain) } });
      }
    };
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || !ITERATION_METHODS.has(callee.property?.name)) {
          return;
        }
        reportIfMutated(chainOf(callee.object), node.arguments[0], node);
      },
      ForOfStatement(node) {
        reportIfMutated(chainOf(node.right), node.body, node);
      },
      ForStatement(node) {
        reportIfMutated(indexedChain(node), node.body, node);
      },
    };
  },
};
