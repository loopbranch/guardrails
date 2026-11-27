import { describe } from 'vitest';
import { createRuleTester } from './rule-tester.mjs';
import { noInsecureRandom } from './no-insecure-random.mjs';
import { noUnsafeStorage } from './no-unsafe-storage.mjs';
import { noPublicAddress } from './no-public-address.mjs';
import { noDeveloperInfo } from './no-developer-info.mjs';
import { noCommentedCode } from './no-commented-code.mjs';
import { postmessageOrigin } from './postmessage-origin.mjs';
import { noArrayProperty } from './no-array-property.mjs';
import { noArrayMutationInIteration } from './no-array-mutation-in-iteration.mjs';
import { fileNaming } from './file-naming.mjs';
import { arrayCopySpread } from './array-copy-spread.mjs';
import { numberConversion } from './number-conversion.mjs';
import { preferOptionalChainStrict } from './prefer-optional-chain-strict.mjs';

const tester = createRuleTester();

// RuleTester 在调用时注册 describe/it，必须放在 describe 的收集阶段执行；
// 放进 it 回调会在运行期注册，vitest 不会收集，用例等于未执行。
describe('公司规范新增机检规则', () => {
  tester.run('no-insecure-random', noInsecureRandom, {
    valid: ['crypto.randomUUID()'],
    invalid: [{ code: 'Math.random()', errors: [{ messageId: 'insecure' }] }],
  });

  tester.run('no-unsafe-storage', noUnsafeStorage, {
    valid: ['const cache = new Map()'],
    invalid: [
      { code: 'window.indexedDB', errors: [{ messageId: 'banned' }] },
      { code: "window.openDatabase('db')", errors: [{ messageId: 'banned' }] },
    ],
  });

  tester.run('no-public-address', noPublicAddress, {
    valid: [
      "const local = 'http://localhost:3000/x'",
      "const ip = '127.0.0.1'",
      "const cidr = '10.0.0.0/8'",
      // 保留域名与内网主机是测试夹具的标准占位写法，不算公网地址。
      "const placeholder = 'https://xclaw.example/?token=test'",
      "const placeholderTld = 'https://template.example.invalid/cover.png'",
      "const placeholderTest = 'https://example.test/preview'",
      "const placeholderExample = 'https://xclaw.example.com/api'",
      "const intranet = 'http://storage.internal:9000'",
      "const docker = 'http://host.docker.internal:4199/x'",
      "const privateUrl = 'http://10.0.0.8:8080'",
      "const mail = 'aigc@xclaw.internal'",
      "const allowedPair = 'aigc@xclaw.internal reviewer@panel.example'",
      // e2e 联调夹具需要真实地址，仍按目录放行。
      { code: "const url = 'https://api.vendor-cloud.net/x'", filename: 'e2e/checkout.spec.ts' },
    ],
    invalid: [
      { code: "const url = 'https://api.vendor-cloud.net/x'", errors: [{ messageId: 'address' }] },
      { code: "const testNet = '192.0.2.0'", errors: [{ messageId: 'address' }] },
      { code: 'const mail = "dev.user@company.com"', errors: [{ messageId: 'address' }] },
      // 同一字符串里既有私有 IP 也有公网 IP 时，同样要逐个判断。
      { code: "const mixedIps = '10.0.0.8 117.78.11.88'", errors: [{ messageId: 'address' }] },
      { code: "const mixedIps = '117.78.11.88 10.0.0.8'", errors: [{ messageId: 'address' }] },
      // 同一字符串里既有放行邮箱也有真实邮箱时，必须逐个判断，不能只查第一个。
      {
        code: "const mixed = 'aigc@xclaw.internal partner@vendor-mail.net'",
        errors: [{ messageId: 'address' }],
      },
      {
        code: "const mixed = 'partner@vendor-mail.net aigc@xclaw.internal'",
        errors: [{ messageId: 'address' }],
      },
      // 单元测试同样受检：夹具里的真实地址要改成占位域名。
      {
        code: "const panel = 'https://117.78.11.88/?token=aigc-test'",
        filename: 'src/index.test.ts',
        errors: [{ messageId: 'address' }],
      },
    ],
  });

  tester.run('no-developer-info', noDeveloperInfo, {
    valid: ['// 说明：处理超时'],
    invalid: [{ code: '// 作者：张三 13800138000', errors: [{ messageId: 'info' }] }],
  });

  tester.run('no-commented-code', noCommentedCode, {
    valid: ['// 这里解释业务含义', '// 变量含义不是代码'],
    invalid: [{ code: '// const value = await load();', errors: [{ messageId: 'commented' }] }],
  });

  tester.run('postmessage-origin', postmessageOrigin, {
    valid: [
      "source.postMessage(data, 'https://app.example.com')",
      "window.addEventListener('message', (event) => { if (event.origin !== origin) { return; } })",
    ],
    invalid: [
      { code: "source.postMessage(data, '*')", errors: [{ messageId: 'wildcard' }] },
      { code: "window.addEventListener('message', (event) => handle(event.data))", errors: [{ messageId: 'unverified' }] },
    ],
  });

  tester.run('no-array-property', noArrayProperty, {
    valid: ['const list = []; list.length = 1;', 'const list = []; list[0] = 1;', 'const obj = {}; obj.total = 1;'],
    invalid: [
      { code: 'const list = []; list.total = 1;', errors: [{ messageId: 'property' }] },
      { code: "const list = []; list['total'] = 1;", errors: [{ messageId: 'property' }] },
    ],
  });

  tester.run('no-array-mutation-in-iteration', noArrayMutationInIteration, {
    valid: [
      'items.forEach((item) => count.push(item))',
      'for (const item of items) { count.push(item); }',
      'for (let i = 0; i < items.length; i += 1) { use(items[i]); }',
    ],
    invalid: [
      { code: 'items.forEach((item) => items.push(item))', errors: [{ messageId: 'mutate' }] },
      { code: 'for (const item of items) { items.push(item); }', errors: [{ messageId: 'mutate' }] },
      { code: 'for (let i = 0; i < items.length; i += 1) { items.splice(i, 1); }', errors: [{ messageId: 'mutate' }] },
    ],
  });

  tester.run('file-naming', fileNaming, {
    valid: [
      { code: 'const value = 1;', filename: 'src/user-profile.ts' },
      { code: 'const value = 1;', filename: 'src/UserProfile.tsx' },
      { code: 'const value = 1;', filename: 'src/UserProfile.module.d.scss.ts' },
    ],
    invalid: [
      { code: 'const value = 1;', filename: 'src/user_profile.ts', errors: [{ messageId: 'name' }] },
      { code: 'const value = 1;', filename: 'src/Foo.TS', errors: [{ messageId: 'extension' }] },
    ],
  });

  tester.run('array-copy-spread', arrayCopySpread, {
    valid: ['const copy = [...items];', 'const first = items.slice(0, 2);'],
    invalid: [
      { code: 'const copy = items.slice();', errors: [{ messageId: 'copy' }] },
      { code: 'const copy = items.slice(0);', errors: [{ messageId: 'copy' }] },
    ],
  });

  tester.run('number-conversion', numberConversion, {
    valid: [
      'const value = Number(raw); if (Number.isNaN(value)) { return; }',
      'const value = Number(raw); if (Number.isFinite(value) === false) { throw new Error("bad"); }',
      'const port = Number(raw); if (!Number.isInteger(port)) { throw new Error("bad"); }',
    ],
    invalid: [
      { code: 'const count = parseInt(text, 10);', errors: [{ messageId: 'banned' }] },
      { code: 'const value = Number(raw);', errors: [{ messageId: 'unchecked' }] },
    ],
  });

  tester.run('prefer-optional-chain-strict', preferOptionalChainStrict, {
    valid: ['const size = list?.length;', 'if (item && other.flag) { use(item); }', 'const value = a && b ? 1 : 2;'],
    invalid: [
      { code: 'if (scope && scope.enabled) { use(scope); }', errors: [{ messageId: 'optional' }] },
      {
        code: "const key = packaged && packaged.startsWith('aigc/') && !packaged.includes('..') ? packaged : fallback;",
        errors: [{ messageId: 'optional' }],
      },
    ],
  });
});
