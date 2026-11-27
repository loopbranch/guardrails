/**
 * G.OTH.05：代码与注释中不写用户不可见的公网地址。
 * 拦截字符串与注释中的 http(s) 地址、IPv4 与邮箱；本机地址、标准协议与示例域名按 E8 放行。
 */
// RFC 2606/6761 保留域名（example/test/invalid/localhost）、内网常用的 .internal 与 .local、
// example.com/net/org 子域，以及项目既有的文档站点都不属于“用户不可见的公网地址”。
const ALLOWED_HOSTS =
  /^(?:(?:[a-z0-9-]+\.)*(?:example|test|invalid|local|internal|localhost)|(?:[a-z0-9-]+\.)*example\.(?:com|net|org)|127\.0\.0\.1|0\.0\.0\.0|www\.w3\.org|json-schemastore\.org|cdn\.jsdelivr\.net|.*\.huaweicloud\.com|.*\.huawei\.com)$/u;
// 只跳过 e2e 目录：真实环境联调夹具需要真实地址；单元测试同样受检，地址应使用占位域名。
const SKIP_FILE = /[\\/]e2e[\\/]/u;
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

/** 主机放行：保留域名与文档站点，以及 URL 形式出现的私有网段地址（如 `http://10.0.0.8:8080`）。 */
const isAllowedHost = (host) => ALLOWED_HOSTS.test(host) || (IPV4_PATTERN.test(host) && isLocalOrPrivate(host));
const domainOf = (email) => email.slice(email.lastIndexOf('@') + 1);

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
        if (looksLikeHost(host) && !isAllowedHost(host)) {
          context.report({ node, messageId: 'address', data: { value: url } });
        }
      }
      if (URL_PATTERN.test(text) === false && IPV4_PATTERN.test(text)) {
        const ip = text.match(IPV4_PATTERN)?.[0];
        if (ip !== undefined && !isLocalOrPrivate(ip)) {
          context.report({ node, messageId: 'address', data: { value: ip } });
        }
      }
      const email = text.match(EMAIL_PATTERN)?.[0];
      if (email !== undefined && !isAllowedHost(domainOf(email))) {
        context.report({ node, messageId: 'address', data: { value: email } });
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
