/**
 * G.OTH.05：代码与注释中不写用户不可见的公网地址。
 * 拦截字符串与注释中的 http(s) 地址、IPv4 与邮箱；本机地址、标准协议与示例域名按 E8 放行。
 */
const ALLOWED_HOSTS =
  /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|www\.w3\.org|json-schemastore\.org|example\.com|test\.local|.*\.huaweicloud\.com|.*\.huawei\.com|cdn\.jsdelivr\.net|[a-z0-9-]+\.[a-z0-9-]+\.example)/u;
const SKIP_FILE = /(?:[\\/]e2e[\\/]|\.(?:test|spec)\.)/u;
const looksLikeHost = (host) => host.includes('.');

/** 与平台口径一致：私有网段、回环、通配、组播与保留高位段不算“公网地址”。 */
const isLocalOrPrivate = (ip) => {
  const [first, second] = ip.split('.').map(Number);
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};
const URL_PATTERN = /https?:\/\/[^\s"'`)]+/giu;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/u;
const EMAIL_PATTERN = /[\w.+-]+@[a-z][\w-]*(?:\.[a-z][\w-]*)+/iu;

const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

export const noPublicAddress = {
  meta: {
    type: 'suggestion',
    docs: { description: '禁止代码与注释中出现公网地址、IP 或邮箱' },
    schema: [],
    messages: {
      address: '代码或注释包含公网地址 {{value}}；请改为配置项或相对路径。',
    },
  },
  create(context) {
    if (SKIP_FILE.test(context.filename)) {
      return {};
    }
    const check = (node, text) => {
      const urls = text.match(URL_PATTERN) ?? [];
      for (const url of urls) {
        const host = hostOf(url);
        if (looksLikeHost(host) && !ALLOWED_HOSTS.test(host)) {
          context.report({ node, messageId: 'address', data: { value: url } });
        }
      }
      if (URL_PATTERN.test(text) === false && IPV4_PATTERN.test(text)) {
        const ip = text.match(IPV4_PATTERN)?.[0];
        if (ip !== undefined && !isLocalOrPrivate(ip)) {
          context.report({ node, messageId: 'address', data: { value: ip } });
        }
      }
      if (EMAIL_PATTERN.test(text)) {
        context.report({ node, messageId: 'address', data: { value: text.match(EMAIL_PATTERN)?.[0] ?? '' } });
      }
    };

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          check(node, node.value);
        }
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          check(comment, comment.value);
        }
      },
    };
  },
};
