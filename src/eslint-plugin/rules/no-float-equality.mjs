import ts from 'typescript';
import { ruleTypeInfo } from './type-info.mjs';

/** 浮点值不直接判等（G.TYP.03）；检测小数与行内算术表达式。 */
const isFloatish = (node) => {
  if (!node) {
    return false;
  }
  if (node.type === 'Literal' && typeof node.value === 'number') {
    return !/^0[xob]/i.test(node.raw) && /[.eE]/.test(node.raw);
  }
  if (node.type === 'UnaryExpression' && ['+', '-'].includes(node.operator)) {
    return isFloatish(node.argument);
  }
  return false;
};

const isStringConcat = (node) => {
  if (node.type === 'Literal') {
    return typeof node.value === 'string';
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return isStringConcat(node.left) || isStringConcat(node.right);
  }
  return node.type === 'TemplateLiteral';
};

const arithmeticOperators = new Set(['+', '-', '*', '/', '%', '**']);
const isFloatComputation = (node, sourceCode) => {
  if (node.type !== 'BinaryExpression' || !arithmeticOperators.has(node.operator)) {
    return false;
  }
  if (node.operator === '+' && isStringConcat(node)) {
    return false;
  }
  if ([node.left, node.right].some((operand) => operand.type === 'Literal' && typeof operand.value === 'bigint')) {
    return false;
  }
  const services = ruleTypeInfo(sourceCode);
  if (!services) {
    return true;
  }
  const result = services.getTypeAtLocation(node);
  const members = result.isUnion() ? result.types : [result];
  return members.some((member) => !(member.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.BigIntLike)));
};

export const noFloatEquality = {
  meta: {
    type: 'suggestion',
    docs: { description: '浮点值不直接使用 ==/===' },
    schema: [],
    messages: { float: '浮点值不要直接判等，使用业务容差或取整后再比较。' },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        if (!['==', '==='].includes(node.operator)) {
          return;
        }
        const computed = isFloatComputation(node.left, context.sourceCode) || isFloatComputation(node.right, context.sourceCode);
        if (computed || isFloatish(node.left) || isFloatish(node.right)) {
          context.report({ node, messageId: 'float' });
        }
      },
    };
  },
};
