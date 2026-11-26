import { describe, expect, it } from 'vitest';
import { classNamesFromStyles, hasAntdSelector, noRepoClassSelector, repoClassSelectors } from './no-repo-class-selector.mjs';
import { createRuleTester } from './rule-tester.mjs';

const options = [{ classNames: ['playhead', 'timeline-panel', 'clip', 'selected'] }];
const forbidden = (name) => ({ messageId: 'forbidden', data: { name } });

createRuleTester().run('no-repo-class-selector', noRepoClassSelector, {
  valid: [
    { code: "page.getByTestId('timeline-playhead');", options },
    { code: "page.getByRole('region', { name: '时间线编辑区域' });", options },
    // 不是选择器写法：命令名、文件名、普通文本
    { code: "command(page, 'review.playhead.set', { time: 1 });", options },
    { code: "upload('sample.clip.png');", options },
    // 断言元素的类状态，不是按类名定位
    { code: 'await expect(item).toHaveClass(/selected/);', options },
    // 不在本仓样式中的类名
    { code: "page.locator('.unknown-thing');", options },
  ],
  invalid: [
    { code: "page.locator('.playhead');", options, errors: [forbidden('playhead')] },
    { code: "page.locator('.timeline-panel .clip');", options, errors: [forbidden('timeline-panel'), forbidden('clip')] },
    { code: "page.locator('div.clip.selected');", options, errors: [forbidden('clip'), forbidden('selected')] },
    { code: 'page.locator(\'[data-kind="x"].clip\');', options, errors: [forbidden('clip')] },
    { code: "row.locator(':scope > .clip');", options, errors: [forbidden('clip')] },
    { code: "page.locator('section:has(.playhead)');", options, errors: [forbidden('playhead')] },
    { code: 'element.closest(`.timeline-panel`);', options, errors: [forbidden('timeline-panel')] },
    { code: 'page.locator(`.clip[data-id="${id}"]`);', options, errors: [forbidden('clip')] },
    { code: 'document.querySelectorAll(".clip, .playhead");', options, errors: [forbidden('clip'), forbidden('playhead')] },
  ],
});

describe('本仓样式类名清单', () => {
  it('只取选择器中的类名，跳过声明值、注释与 antd 类名', () => {
    const css = [
      '/* .commented-out {} */',
      '.editor-shell .rail > .rail-item:hover, .ant-btn.primary-action { transition: opacity .5s; background: url(a.png); }',
      '@media (max-width: 1100.5px) { .topbar { gap: 0.5rem; } }',
      ':root[data-editor-theme="light"] .anticon-x, .clip:not(.selected) { opacity: 1; }',
    ].join('\n');
    expect([...classNamesFromStyles(css)].sort()).toEqual([
      'clip',
      'editor-shell',
      'primary-action',
      'rail',
      'rail-item',
      'selected',
      'topbar',
    ]);
  });

  it('同一段文本中的类名按出现顺序去重', () => {
    expect(repoClassSelectors('.clip .clip, button.playhead', new Set(['clip', 'playhead']))).toEqual(['clip', 'playhead']);
  });
});

// antd 内部类名定位一律禁止，不设白名单。
const filename = 'e2e/steps/sample.steps.ts';
const antd = { messageId: 'antd' };

createRuleTester().run('no-repo-class-selector（antd 类名）', noRepoClassSelector, {
  valid: [
    { code: "page.getByRole('option', { name: '1080p' });", filename, options: [{ classNames: [] }] },
    // 不是选择器写法：属性访问、文件名
    { code: "const name = 'theme.ant-x'; page.getByRole('button');", filename, options: [{ classNames: [] }] },
  ],
  invalid: [
    { code: "page.locator('.ant-tooltip');", filename, options: [{ classNames: [] }], errors: [antd] },
    {
      code: "page.locator('.ant-select'); page.locator('div > .anticon-close');",
      filename,
      options: [{ classNames: [] }],
      errors: [
        { ...antd, line: 1, column: 14 },
        { ...antd, line: 1, column: 43 },
      ],
    },
    { code: "dialog.locator('.ant-modal-footer .ant-btn-default');", options, errors: [antd] },
  ],
});

describe('antd 类名选择器识别', () => {
  it('识别 .ant-* 与 .anticon* 的选择器写法，忽略标识符后的点号', () => {
    expect(['.ant-modal', 'div .anticon-close', ':has(.ant-btn)', 'foo.ant-x', 'ant-modal'].map(hasAntdSelector)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});
