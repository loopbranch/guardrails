import { noGlobalStyleImport } from './no-global-style-import.mjs';
import { createRuleTester } from './rule-tester.mjs';

createRuleTester().run('no-global-style-import', noGlobalStyleImport, {
  valid: [
    { code: "import 'antd/dist/reset.css'; import './styles/global.scss';", filename: '/repo/apps/aigc-web/src/main.tsx' },
    { code: "import styles from './App.module.scss';", filename: '/repo/apps/aigc-web/src/app/App.tsx' },
    { code: "import { App } from './app/index.js';", filename: '/repo/apps/aigc-web/src/app/App.tsx' },
    {
      code: "import './theme.scss';",
      filename: '/repo/apps/aigc-web/src/entry.tsx',
      options: [{ entries: ['apps/aigc-web/src/entry.tsx'] }],
    },
  ],
  invalid: [
    {
      code: "import '../shared/styles.css';",
      filename: '/repo/apps/aigc-web/src/app/App.tsx',
      errors: [{ messageId: 'forbidden', data: { source: '../shared/styles.css', entries: 'apps/aigc-web/src/main.tsx' } }],
    },
    {
      code: "import '../styles/global.scss';",
      filename: '/repo/apps/aigc-web/src/timeline/Timeline.tsx',
      errors: [{ messageId: 'forbidden' }],
    },
    {
      // 文件名只是以 main.tsx 结尾但不是入口路径
      code: "import './x.css';",
      filename: '/repo/apps/aigc-web/src/app/not-main.tsx',
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: "void import('./lazy.css');",
      filename: '/repo/apps/aigc-web/src/app/App.tsx',
      errors: [{ messageId: 'forbidden' }],
    },
  ],
});
