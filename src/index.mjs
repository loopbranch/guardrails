// 包入口：语言注册表、能力矩阵、任务编排与 SARIF 结果协议。
export {
  TASK_NAMES,
  METRIC_IDS,
  loadLanguages,
  loadProfile,
  effectiveThreshold,
  resolveLanguage,
  capabilityMatrix,
  assertTask,
} from './registry.mjs';
export { buildSarif, verdictOf, metricResult, LEVELS } from './sarif.mjs';
export { runTask, groupByLanguage, metricsThresholds } from './run.mjs';
export { changedFiles } from './changed.mjs';
