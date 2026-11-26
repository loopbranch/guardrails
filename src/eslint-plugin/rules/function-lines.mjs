/**
 * G.MET.01：按平台 cmetrics 的口径统计函数自身代码行数。
 * 平台值计算整段函数（含参数与返回类型注解）的非空非注释行，并排除嵌套函数的整段代码；
 * 本实现与平台实测值可能相差 1–2 行，因此以 max - 2 作为触发线，宁可多降、不漏报
 * （issue #148 的平台样本：194、118、108、103，参数类型多行时平台同样计入）。
 */
const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'TSDeclareFunction']);

const isFunction = (node) =>
  FUNCTION_TYPES.has(node.type) || (node.type === 'MethodDefinition' && node.value?.type === 'FunctionExpression');

/** 遍历子树，收集函数节点；不进入已收集的函数内部，避免重复排除。 */
const collectFunctions = (node, out) => {
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const value = node[key];
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (!child || typeof child.type !== 'string') {
        continue;
      }
      if (isFunction(child)) {
        out.push(child);
        continue;
      }
      collectFunctions(child, out);
    }
  }
};

const rangeOf = (node) => node.range ?? [node.start, node.end];

/** 去掉嵌套函数与注释后，统计整段函数（含参数与注解）的非空行数。 */
const ownCodeLines = (sourceCode, node) => {
  const text = sourceCode.text;
  const [start, end] = rangeOf(node);
  const functions = [];
  collectFunctions(node, functions);
  const comments = sourceCode.getAllComments().filter((comment) => {
    const [from, to] = rangeOf(comment);
    return from >= start && to <= end;
  });
  const removed = [...functions.map(rangeOf), ...comments.map(rangeOf)].sort((left, right) => left[0] - right[0]);
  let output = '';
  let cursor = start;
  for (const [from, to] of removed) {
    if (from > cursor) {
      output += text.slice(cursor, from);
    }
    cursor = Math.max(cursor, to);
  }
  if (cursor < end) {
    output += text.slice(cursor, end);
  }
  return output.split('\n').filter((line) => line.trim().length > 0).length;
};

export const functionLines = {
  meta: {
    type: 'suggestion',
    docs: { description: '函数自身代码行数不超过上限（平台 G.MET.01 口径）' },
    schema: [{ type: 'object', properties: { max: { type: 'integer', minimum: 1 } }, additionalProperties: false }],
    messages: {
      tooLong: '函数自身代码行数为 {{actual}}，超过上限 {{max}}（不计空行、注释与嵌套函数）。',
    },
  },
  create(context) {
    const [options = {}] = context.options;
    const max = options.max ?? 100;
    const limit = max - 2;
    const check = (node) => {
      if (!node.body || node.body.type !== 'BlockStatement') {
        return;
      }
      const actual = ownCodeLines(context.sourceCode, node);
      if (actual > limit) {
        context.report({ node, messageId: 'tooLong', data: { actual: String(actual), max: String(max) } });
      }
    };
    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
};
