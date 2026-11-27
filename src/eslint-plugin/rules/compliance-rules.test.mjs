import { describe, it } from 'vitest';
import { createRuleTester } from './rule-tester.mjs';
import { noInsecureRandom } from './no-insecure-random.mjs';
import { noUnsafeStorage } from './no-unsafe-storage.mjs';
import { noPublicAddress } from './no-public-address.mjs';
import { noDeveloperInfo } from './no-developer-info.mjs';
import { noCommentedCode } from './no-commented-code.mjs';
import { postmessageOrigin } from './postmessage-origin.mjs';
import { noArrayProperty } from './no-array-property.mjs';
import { noArrayMutationInIteration } from './no-array-mutation-in-iteration.mjs';
import { arrayCopySpread } from './array-copy-spread.mjs';
import { numberConversion } from './number-conversion.mjs';
import { preferOptionalChainStrict } from './prefer-optional-chain-strict.mjs';

const tester = createRuleTester();

describe('公司规范新增机检规则', () => {
  it('G.OTH.01 拦截 Math.random', () => {
    tester.run('no-insecure-random', noInsecureRandom, {
      valid: ['crypto.randomUUID()'],
      invalid: [{ code: 'Math.random()', errors: [{ messageId: 'insecure' }] }],
    });
  });

  it('G.WSQ.01 拦截 IndexedDB 与 Web SQL', () => {
    tester.run('no-unsafe-storage', noUnsafeStorage, {
      valid: ['const cache = new Map()'],
      invalid: [
        { code: 'window.indexedDB', errors: [{ messageId: 'banned' }] },
        { code: "window.openDatabase('db')", errors: [{ messageId: 'banned' }] },
      ],
    });
  });

  it('G.OTH.05 拦截公网地址与邮箱，放行本机地址', () => {
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
        // e2e 联调夹具需要真实地址，仍按目录放行。
        { code: "const url = 'https://api.vendor-cloud.net/x'", filename: 'e2e/checkout.spec.ts' },
      ],
      invalid: [
        { code: "const url = 'https://api.vendor-cloud.net/x'", errors: [{ messageId: 'address' }] },
        { code: "const testNet = '192.0.2.0'", errors: [{ messageId: 'address' }] },
        { code: 'const mail = "dev.user@company.com"', errors: [{ messageId: 'address' }] },
        // 单元测试同样受检：夹具里的真实地址要改成占位域名。
        {
          code: "const panel = 'https://117.78.11.88/?token=aigc-test'",
          filename: 'src/index.test.ts',
          errors: [{ messageId: 'address' }],
        },
      ],
    });
  });

  it('G.OTH.04 拦截注释中的个人信息', () => {
    tester.run('no-developer-info', noDeveloperInfo, {
      valid: ['// 说明：处理超时'],
      invalid: [{ code: '// 作者：张三 13800138000', errors: [{ messageId: 'info' }] }],
    });
  });

  it('G.OTH.03 拦截注释掉的代码', () => {
    tester.run('no-commented-code', noCommentedCode, {
      valid: ['// 这里解释业务含义', '// 变量含义不是代码'],
      invalid: [{ code: '// const value = await load();', errors: [{ messageId: 'commented' }] }],
    });
  });

  it('G.CORS.01 拦截通配 targetOrigin 与未校验 origin 的监听', () => {
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
  });

  it('G.TYP.07 拦截数组字面量上的非数字属性', () => {
    tester.run('no-array-property', noArrayProperty, {
      valid: ['const list = []; list.length = 1;', 'const obj = {}; obj.total = 1;'],
      invalid: [{ code: 'const list = []; list.total = 1;', errors: [{ messageId: 'property' }] }],
    });
  });

  it('G.TYP.09 拦截遍历中增删同一数组', () => {
    tester.run('no-array-mutation-in-iteration', noArrayMutationInIteration, {
      valid: ['items.forEach((item) => count.push(item))'],
      invalid: [{ code: 'items.forEach((item) => items.push(item))', errors: [{ messageId: 'mutate' }] }],
    });
  });

  it('G.TYP.11 拦截 slice 复制，放行带上下界的截取', () => {
    tester.run('array-copy-spread', arrayCopySpread, {
      valid: ['const copy = [...items];', 'const first = items.slice(0, 2);'],
      invalid: [
        { code: 'const copy = items.slice();', errors: [{ messageId: 'copy' }] },
        { code: 'const copy = items.slice(0);', errors: [{ messageId: 'copy' }] },
      ],
    });
  });

  it('G.TYP.15 拦截 parseInt/parseFloat 与未检查 NaN 的 Number()', () => {
    tester.run('number-conversion', numberConversion, {
      valid: [
        'const value = Number(raw); if (Number.isNaN(value)) { return; }',
        'const value = Number(raw); if (Number.isFinite(value) === false) { throw new Error("bad"); }',
      ],
      invalid: [
        { code: 'const count = parseInt(text, 10);', errors: [{ messageId: 'banned' }] },
        { code: 'const value = Number(raw);', errors: [{ messageId: 'unchecked' }] },
      ],
    });
  });

  it('G.AST.03 平台口径：链式条件与三元取值都要用可选链', () => {
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
});
