/**
 * G.TYP.08：遍历数组优先使用数组方法。
 * 只拦明确是普通 Array 类型的索引 for 与 for…in；TypedArray、字符串、Map 与 for…of 均不拦。
 */
const isPlainArray = (services, object) => {
  const checker = services?.program?.getTypeChecker?.();
  const map = services?.esTreeNodeToTSNodeMap;
  if (!checker || !map || object?.type !== 'Identifier') {
    return false;
  }
  const type = checker.getTypeAtLocation(map.get(object));
  const text = checker.typeToString(type);
  if (/^(?:Uint|Int|Float|BigInt|BigUint)\d*Array|^ArrayBuffer|^string|^Map<|^Set</u.test(text)) {
    return false;
  }
  return /^(?:readonly )?Array<|\[\]$/u.test(text);
};

export const preferArrayMethods = {
  meta: {
    type: 'suggestion',
    docs: { description: '普通数组的遍历优先使用 map/filter/forEach 等方法' },
    schema: [],
    messages: { prefer: '普通数组遍历请使用 map/filter/forEach 等数组方法。' },
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    return {
      ForStatement(node) {
        const test = node.test;
        if (test?.type !== 'BinaryExpression' || test.right?.type !== 'MemberExpression') {
          return;
        }
        if (test.right.property?.name !== 'length' || test.right.object.type !== 'Identifier') {
          return;
        }
        if (isPlainArray(services, test.right.object)) {
          context.report({ node, messageId: 'prefer' });
        }
      },
      ForInStatement(node) {
        if (isPlainArray(services, node.right)) {
          context.report({ node, messageId: 'prefer' });
        }
      },
    };
  },
};
