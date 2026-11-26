/**
 * no-weak-test：当一个 it()/test() 的所有断言都是弱断言时报错。
 * 判定口径：
 * 精度优先于召回，不确定时不报；嵌套函数里的断言不追；0 个断言不报。
 */

// 这些 matcher 无法证明业务行为（只验证存在、真值或被调用次数）。toThrow 只在无参时算弱断言。
export const WEAK_MATCHERS = new Set([
  'toBeDefined',
  'toBeUndefined',
  'toBeNull',
  'toBeTruthy',
  'toBeFalsy',
  'toThrow',
  'toHaveBeenCalled',
  'toHaveBeenCalledTimes',
]);

// 链式修饰器，不是 matcher 本身。
const TRANSPARENT_PROPS = new Set(['not', 'resolves', 'rejects']);

const SKIPPED_KEYS = new Set(['parent', 'loc', 'range', 'start', 'end', 'type']);

const isPlainProperty = (node, names) => {
  return Boolean(
    node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property &&
    node.property.type === 'Identifier' &&
    (!names || names.has(node.property.name)),
  );
};

/** 判断 CallExpression 是否为 expect(...).matcher(...) 形式，返回末端 matcher。 */
const getExpectAssertion = (callNode) => {
  if (!callNode || callNode.type !== 'CallExpression') {
    return null;
  }
  const callee = callNode.callee;
  if (!isPlainProperty(callee)) {
    return null;
  }
  let current = callee.object;
  while (isPlainProperty(current, TRANSPARENT_PROPS)) {
    current = current.object;
  }
  const isExpectCall = current?.callee?.type === 'Identifier' && current.callee.name === 'expect';
  if (!current || current.type !== 'CallExpression' || !isExpectCall) {
    return null;
  }
  return { matcherName: callee.property.name, callNode };
};

const isWeakAssertion = ({ matcherName, callNode }) => {
  if (matcherName === 'toThrow') {
    return callNode.arguments.length === 0;
  }
  return WEAK_MATCHERS.has(matcherName);
};

const isFunctionNode = (node) => {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration';
};

const childNodes = (node) => {
  const children = [];
  for (const key of Object.keys(node)) {
    if (SKIPPED_KEYS.has(key)) {
      continue;
    }
    const value = node[key];
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (item && typeof item === 'object' && item.type) {
        children.push(item);
      }
    }
  }
  return children;
};

/** 收集测试体内的 expect 断言；遇到内层函数不递归（helper 封装的断言无法静态判定）。 */
const collectAssertions = (node) => {
  const isUnsupportedNode = !node || typeof node !== 'object' || !node.type;
  if (isUnsupportedNode || isFunctionNode(node)) {
    return [];
  }
  if (node.type === 'CallExpression') {
    const assertion = getExpectAssertion(node);
    if (assertion) {
      return [assertion];
    }
  }
  return childNodes(node).flatMap((child) => collectAssertions(child));
};

const TEST_METHODS = new Set(['only', 'skip', 'concurrent', 'each', 'for', 'skipIf', 'runIf']);

const isTestCallee = (node) => {
  if (node.type === 'Identifier') {
    return node.name === 'it' || node.name === 'test';
  }
  if (node.type === 'CallExpression') {
    return isPlainProperty(node.callee, TEST_METHODS) && isTestCallee(node.callee);
  }
  return isPlainProperty(node, TEST_METHODS) && isTestCallee(node.object);
};

/** @type {import('eslint').Rule.RuleModule} */
export const noWeakTest = {
  meta: {
    type: 'suggestion',
    docs: { description: '禁止 it()/test() 的所有断言都是弱断言（只验证存在、真值或被调用），这样的测试无法证明业务行为' },
    messages: {
      noWeakTest:
        '该测试的所有断言都是弱断言（只验证存在、真值或被调用），无法证明业务行为；' +
        '请改为断言收敛的业务值（toBe/toEqual/toContain 真实值）或 toHaveBeenCalledWith(具体参数)。',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.arguments.length < 2 || !isTestCallee(node.callee)) {
          return;
        }
        const fn = node.arguments[1];
        if (fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression') {
          return;
        }
        const assertions = collectAssertions(fn.body);
        if (assertions.length === 0 || !assertions.every((assertion) => isWeakAssertion(assertion))) {
          return;
        }
        context.report({ node, messageId: 'noWeakTest' });
      },
    };
  },
};
