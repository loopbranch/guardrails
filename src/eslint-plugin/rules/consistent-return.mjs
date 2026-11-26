import ts from 'typescript';

import { ruleTypeInfo } from './type-info.mjs';

const coversSwitchType = (node, sourceCode) => {
  if (node.cases.some((clause) => !clause.test) || !node.cases.at(-1)?.consequent.length) {
    return false;
  }
  const services = ruleTypeInfo(sourceCode);
  if (!services) {
    return false;
  }
  const checker = services.program.getTypeChecker();
  const cases = node.cases.map((clause) => services.getTypeAtLocation(clause.test));
  const discriminant = services.getTypeAtLocation(node.discriminant);
  const type = checker.getBaseConstraintOfType(discriminant) ?? discriminant;
  const members = type.isUnion() ? type.types : [type];
  return members.every(
    (member) =>
      Boolean(member.flags & ts.TypeFlags.Unit) &&
      cases.some((value) => Boolean(value.flags & ts.TypeFlags.Unit) && checker.isTypeAssignableTo(member, value)),
  );
};

// ESLint 自身的图已区分 throw、catch、finally 与循环；只截断可证明不会正常返回的调用所在线段。
const hasNormalExit = ({ initialSegment, reachableSegments, calls, excludedEdges }, sourceCode) => {
  if (!calls.size && !excludedEdges.size) {
    return reachableSegments.size > 0;
  }
  const pending = [...reachableSegments];
  const seen = new Set();
  while (pending.length) {
    const segment = pending.pop();
    if (seen.has(segment)) {
      continue;
    }
    seen.add(segment);
    if (calls.get(segment)?.some((call) => Boolean(ruleTypeInfo(sourceCode)?.getTypeAtLocation(call).flags & ts.TypeFlags.Never))) {
      continue;
    }
    if (segment === initialSegment) {
      return true;
    }
    pending.push(...segment.prevSegments.filter((previous) => !excludedEdges.get(segment)?.has(previous)));
  }
  return false;
};

/** G.MET.07：按 ESLint 控制流检查正常退出路径，包括 React 组件与 effect。 */
export const consistentReturn = {
  meta: {
    type: 'suggestion',
    docs: { description: '同一函数所有路径的返回方式一致' },
    schema: [],
    messages: {
      mixed: '同一函数不能混用带值和不带值的 return。',
      missing: '此函数有返回值，但存在未显式返回值的退出路径。',
    },
  },
  create(context) {
    const functions = [];
    const lastCaseTests = new WeakMap();
    const checkExit = (node) => {
      const state = functions.at(-1);
      if (state.firstReturnHasValue && hasNormalExit(state, context.sourceCode)) {
        context.report({ node: node.id ?? context.sourceCode.getFirstToken(node), messageId: 'missing' });
      }
    };
    return {
      onCodePathStart({ initialSegment }) {
        functions.push({
          initialSegment,
          firstReturnHasValue: undefined,
          reachableSegments: new Set(),
          calls: new Map(),
          excludedEdges: new Map(),
        });
      },
      onCodePathEnd() {
        functions.pop();
      },
      onCodePathSegmentStart(segment, node) {
        const state = functions.at(-1);
        state.reachableSegments.add(segment);
        // 穷尽 switch 只移除“所有标签均未命中”的边；break 与命中后落空仍是正常出口。
        if (node.type === 'SwitchStatement' && lastCaseTests.has(node) && coversSwitchType(node, context.sourceCode)) {
          state.excludedEdges.set(segment, lastCaseTests.get(node));
        }
      },
      onCodePathSegmentEnd(segment) {
        functions.at(-1).reachableSegments.delete(segment);
      },
      'SwitchCase > *.test:exit'(test) {
        const clause = test.parent;
        if (clause === clause.parent.cases.at(-1)) {
          lastCaseTests.set(clause.parent, new Set(functions.at(-1).reachableSegments));
        }
      },
      'ExpressionStatement:exit'(node) {
        if (node.expression.type === 'CallExpression' || node.expression.type === 'AwaitExpression') {
          const state = functions.at(-1);
          for (const segment of state.reachableSegments) {
            const calls = state.calls.get(segment) ?? [];
            calls.push(node.expression);
            state.calls.set(segment, calls);
          }
        }
      },
      ReturnStatement(node) {
        const state = functions.at(-1);
        const hasValue = Boolean(node.argument);
        state.firstReturnHasValue ??= hasValue;
        if (state.firstReturnHasValue !== hasValue) {
          context.report({ node, messageId: 'mixed' });
        }
      },
      'Program:exit': checkExit,
      'FunctionDeclaration:exit': checkExit,
      'FunctionExpression:exit': checkExit,
      'ArrowFunctionExpression:exit': checkExit,
    };
  },
};
