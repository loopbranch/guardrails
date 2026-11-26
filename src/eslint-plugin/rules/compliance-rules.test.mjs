import { describe, it } from 'vitest';
import { createRuleTester } from './rule-tester.mjs';
import { noInsecureRandom } from './no-insecure-random.mjs';
import { noUnsafeStorage } from './no-unsafe-storage.mjs';
import { noPublicAddress } from './no-public-address.mjs';
import { noDeveloperInfo } from './no-developer-info.mjs';
import { noCommentedCode } from './no-commented-code.mjs';
import { postmessageOrigin } from './postmessage-origin.mjs';

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
      valid: ["const local = 'http://localhost:3000/x'", "const ip = '10.0.0.0/8'"],
      invalid: [
        { code: "const url = 'https://api.vendor-cloud.net/x'", errors: [{ messageId: 'address' }] },
        { code: 'const mail = "dev.user@company.com"', errors: [{ messageId: 'address' }] },
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
});
