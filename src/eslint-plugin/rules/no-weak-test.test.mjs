import { describe, expect, it } from 'vitest';
import { noWeakTest, WEAK_MATCHERS } from './no-weak-test.mjs';
import { createRuleTester } from './rule-tester.mjs';

describe('no-weak-test 弱匹配器集合', () => {
  it('弱匹配器集合固定为下列 matcher', () => {
    expect([...WEAK_MATCHERS].sort()).toEqual(
      [
        'toBeDefined',
        'toBeFalsy',
        'toBeNull',
        'toBeTruthy',
        'toBeUndefined',
        'toHaveBeenCalled',
        'toHaveBeenCalledTimes',
        'toThrow',
      ].sort(),
    );
  });
});

createRuleTester().run('no-weak-test', noWeakTest, {
  valid: [
    // 有一个强断言即可
    "it('x', () => { expect(a).toBeDefined(); expect(a.id).toBe('clip-1'); });",
    // toThrow 带参数是强断言
    "test('x', () => { expect(() => run()).toThrow('bad input'); });",
    // toHaveBeenCalledWith 是强断言
    "it('x', () => { expect(spy).toHaveBeenCalledWith(1, 2); });",
    // 0 个断言不归本规则管
    "it('x', () => { run(); });",
    // 嵌套函数中的断言不追（精度优先）
    "it('x', () => { [1].forEach((v) => expect(v).toBeTruthy()); });",
    // 测试体不是函数字面量时无法静态判断
    "it('x', handler);",
    // 非测试调用
    "describe('x', () => { expect(a).toBeTruthy(); });",
    // .not 透明修饰后的强断言
    "it('x', () => { expect(a).not.toEqual([]); });",
  ],
  invalid: [
    { code: "it('x', () => { expect(a).toBeDefined(); });", errors: [{ messageId: 'noWeakTest' }] },
    { code: "test('x', async () => { await expect(p).resolves.toBeTruthy(); });", errors: [{ messageId: 'noWeakTest' }] },
    { code: "it.only('x', () => { expect(fn).toThrow(); expect(spy).toHaveBeenCalledTimes(2); });", errors: [{ messageId: 'noWeakTest' }] },
    { code: "test.skip('x', function () { expect(a).not.toBeNull(); });", errors: [{ messageId: 'noWeakTest' }] },
    { code: "it.concurrent('x', () => { expect(spy).toHaveBeenCalled(); });", errors: [{ messageId: 'noWeakTest' }] },
    { code: "it.each([1, 2])('x %s', () => { expect(a).toBeDefined(); });", errors: [{ messageId: 'noWeakTest' }] },
    { code: "test.skipIf(false).concurrent('x', () => { expect(spy).toHaveBeenCalled(); });", errors: [{ messageId: 'noWeakTest' }] },
  ],
});
