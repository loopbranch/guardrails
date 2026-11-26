// 结果协议：SARIF 2.1.0；缺陷与度量都以 result 表示，度量附数值、阈值与单位。
const SARIF_VERSION = '2.1.0';
const SCHEMA_URL = 'https://json.schemastore.org/sarif-2.1.0.json';

export const LEVELS = ['error', 'warning', 'note'];

const normalizeLevel = (level) => {
  return LEVELS.includes(level) ? level : 'warning';
};

const messageOf = (message) => {
  return typeof message === 'string' ? { text: message } : message;
};

const toResult = (finding) => {
  const result = {
    ruleId: finding.ruleId,
    level: normalizeLevel(finding.level),
    message: messageOf(finding.message),
  };
  if (finding.file !== undefined) {
    result.locations = [
      {
        physicalLocation: {
          artifactLocation: { uri: finding.file },
          ...(finding.line === undefined ? {} : { region: { startLine: finding.line } }),
        },
      },
    ];
  }
  if (finding.properties !== undefined) {
    result.properties = finding.properties;
  }
  if (finding.fix !== undefined) {
    result.fixes = [{ description: { text: finding.fix } }];
  }
  return result;
};

export const metricResult = ({ ruleId, file, line, metric, value, threshold, unit, displayName }) => {
  const label = displayName ?? metric;
  return toResult({
    ruleId,
    level: value > threshold ? 'error' : 'note',
    message: `${label}=${value}，阈值 ${threshold} ${unit}`,
    file,
    line,
    properties: { metric, value, threshold, unit },
  });
};

export const buildSarif = ({ toolName, toolVersion, findings = [], skipped = [] }) => {
  const rules = new Map();
  for (const finding of findings) {
    if (!rules.has(finding.ruleId)) {
      rules.set(finding.ruleId, { id: finding.ruleId, name: finding.ruleId });
    }
  }
  return {
    $schema: SCHEMA_URL,
    version: SARIF_VERSION,
    runs: [
      {
        tool: { driver: { name: toolName, version: toolVersion, rules: [...rules.values()] } },
        results: findings.map(toResult),
        invocations: [
          {
            executionSuccessful: true,
            toolExecutionNotifications: skipped.map((entry) => ({
              level: 'note',
              message: { text: `unsupported: ${entry.language}.${entry.task} — ${entry.reason}` },
            })),
          },
        ],
      },
    ],
  };
};

/** 结论三态：有违例或超阈值 fail；已执行无问题 pass；规范上不设该能力 unsupported。 */
export const verdictOf = ({ findings = [], unsupported = false }) => {
  if (unsupported) {
    return 'unsupported';
  }
  return findings.some((finding) => normalizeLevel(finding.level) === 'error') ? 'fail' : 'pass';
};
