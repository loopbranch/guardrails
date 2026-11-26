/**
 * G.CORS.01：跨窗口通信必须严格核对来源。
 * - 发送端禁止 `postMessage(data, '*')`；
 * - 接收端 `addEventListener('message', handler)` 的处理函数必须读取 `event.origin`。
 */
const receivesOrigin = (node) => {
  let found = false;
  const visit = (current) => {
    if (current === null || current === undefined || typeof current !== 'object') {
      return;
    }
    if (current.type === 'MemberExpression' && !current.computed && current.property?.name === 'origin') {
      found = true;
      return;
    }
    for (const key of Object.keys(current)) {
      if (key === 'parent') {
        continue;
      }
      const value = current[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else {
        visit(value);
      }
    }
  };
  visit(node);
  return found;
};

const SKIP_FILE = /(?:[\\/]e2e[\\/]|\.(?:test|spec)\.)/u;

const isInlineFunction = (node) => {
  return node !== undefined && ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type);
};

export const postmessageOrigin = {
  meta: {
    type: 'problem',
    docs: { description: 'postMessage 必须校验来源' },
    schema: [],
    messages: {
      wildcard: 'postMessage 的 targetOrigin 不能是 *，请写明接收方来源。',
      unverified: "message 监听必须校验 event.origin，不能用 '*' 或省略校验。",
    },
  },
  create(context) {
    if (SKIP_FILE.test(context.filename)) {
      return {};
    }
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || callee.property?.name !== 'postMessage') {
          return;
        }
        const target = node.arguments[1];
        if (target?.type === 'Literal' && target.value === '*') {
          context.report({ node, messageId: 'wildcard' });
        }
      },
      'CallExpression[callee.property.name="addEventListener"]'(node) {
        const [eventName, handler] = node.arguments;
        if (eventName?.type !== 'Literal' || eventName.value !== 'message' || handler === undefined) {
          return;
        }
        if (isInlineFunction(handler) && !receivesOrigin(handler)) {
          context.report({ node: handler, messageId: 'unverified' });
        }
      },
    };
  },
};
