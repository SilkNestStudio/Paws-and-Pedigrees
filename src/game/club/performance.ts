import type { Discipline } from './model';

export interface ActivityReport {
  context?: 'training' | 'event';
  activity?: 'woodland-search';
  caseName?: string;
  scentRefreshes?: number;
  redirects?: number;
  rules: 2;
  discipline: Discipline;
  completed: number;
  total: number;
  seconds: number;
  distance: number;
  mistakes: number;
  commands: number;
  workSeconds: number;
  currentSeconds: number;
  staminaUsed: number;
  turnSeconds: number;
  completionPoints: number;
  pacePoints: number;
  controlPoints: number;
  score: number;
}
export type PerformanceInput = Pick<ActivityReport, 'discipline' | 'completed' | 'total' | 'seconds' | 'distance' | 'mistakes'> & Partial<Pick<ActivityReport, 'commands' | 'workSeconds' | 'currentSeconds' | 'staminaUsed' | 'turnSeconds'>>;
const round = (n: number) => Math.round(n * 10) / 10;
export function performanceReport(input: PerformanceInput): ActivityReport {
  const fraction = Math.max(0, Math.min(1, input.completed / Math.max(1, input.total)));
  const completionPoints = round(60 * fraction);
  // Every second matters; no full-score grace period. No points for doing nothing.
  const pacePoints = round(25 * Math.max(0, 1 - input.seconds / 180) * fraction);
  const controlPoints = round(Math.max(0, 15 - input.mistakes * 3) * fraction);
  return {
    rules: 2, ...input, seconds: round(input.seconds), distance: round(input.distance),
    commands: input.commands ?? 0, workSeconds: round(input.workSeconds ?? 0),
    currentSeconds: round(input.currentSeconds ?? 0), staminaUsed: round(input.staminaUsed ?? 0),
    turnSeconds: round(input.turnSeconds ?? 0), completionPoints, pacePoints, controlPoints,
    score: round(completionPoints + pacePoints + controlPoints),
  };
}
export function reportMetrics(report: ActivityReport): [string, string][] {
  const metrics: [string, string][] = [['Time', `${report.seconds.toFixed(1)}s`], ['Distance traveled', `${report.distance.toFixed(1)}m`]];
  if (report.context === 'training') return [...metrics, ['Corrections', String(report.mistakes)]];
  if (report.activity === 'woodland-search') return [...metrics, ['Time investigating', `${report.workSeconds.toFixed(1)}s`], ['Animal trails ruled out', String(report.mistakes)], ['Scent refreshes', String(report.scentRefreshes ?? 0)], ['Distractions redirected', String(report.redirects ?? 0)]];
  if (report.discipline === 'search') metrics.push(['Time investigating', `${report.workSeconds.toFixed(1)}s`], ['Empty checks', String(report.mistakes)]);
  if (report.discipline === 'herding') metrics.push(['Flock scatters', String(report.mistakes)]);
  if (report.discipline === 'water') metrics.push(['Time in current', `${report.currentSeconds.toFixed(1)}s`], ['Stamina spent', `${report.staminaUsed.toFixed(1)}`], ['Early or recovery returns', String(report.mistakes)]);
  if (report.discipline === 'agility') metrics.push(['Obstacle faults', String(report.mistakes)], ['Time adjusting turns', `${report.turnSeconds.toFixed(1)}s`]);
  return metrics;
}
