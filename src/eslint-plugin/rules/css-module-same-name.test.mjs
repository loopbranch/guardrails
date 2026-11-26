import { cssModuleSameName } from './css-module-same-name.mjs';
import { createRuleTester } from './rule-tester.mjs';

createRuleTester().run('css-module-same-name', cssModuleSameName, {
  valid: [
    { code: "import styles from './Timeline.module.scss';", filename: '/repo/apps/aigc-web/src/timeline/Timeline.tsx' },
    // 非样式模块的导入不受影响
    { code: "import { Button } from 'antd';", filename: '/repo/apps/aigc-web/src/timeline/Timeline.tsx' },
    { code: "import { clamp } from './timeline-math.js';", filename: '/repo/apps/aigc-web/src/timeline/use-clip-drag.ts' },
    // 全局样式归 no-global-style-import 管
    { code: "import './global.scss';", filename: '/repo/apps/aigc-web/src/main.tsx' },
  ],
  invalid: [
    {
      code: "import styles from './Other.module.scss';",
      filename: '/repo/apps/aigc-web/src/timeline/Timeline.tsx',
      errors: [{ messageId: 'mismatch', data: { file: 'Timeline.tsx', expected: 'Timeline.module.scss', source: './Other.module.scss' } }],
    },
    {
      code: "import styles from '../app/Timeline.module.scss';",
      filename: '/repo/apps/aigc-web/src/timeline/Timeline.tsx',
      errors: [{ messageId: 'mismatch' }],
    },
    {
      // 样式模块扩展名只允许 .module.scss
      code: "import styles from './Timeline.module.css';",
      filename: '/repo/apps/aigc-web/src/timeline/Timeline.tsx',
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: "import styles from './use-clip-drag.module.scss';",
      filename: '/repo/apps/aigc-web/src/timeline/use-clip-drag.ts',
      errors: [{ messageId: 'notComponent', data: { file: 'use-clip-drag.ts', source: './use-clip-drag.module.scss' } }],
    },
    {
      code: "const styles = import('./Other.module.scss');",
      filename: '/repo/apps/aigc-web/src/timeline/Timeline.tsx',
      errors: [{ messageId: 'mismatch' }],
    },
  ],
});
