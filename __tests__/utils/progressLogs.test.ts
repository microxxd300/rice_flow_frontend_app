import { isAppLog, mergeLogs, normalizeServerLogs } from '@/utils/progressLogs';

const stages = [{ id: 11, stage_no: 1 }, { id: 13, stage_no: 3 }];
const serverRow = {
  id: 4, farm_cycle: 32, log_date: '2026-10-29', growth_stage: 13,
  issue_type: 'disease', severity: 'low', action_taken: '', observation: 'Tillering · Disease',
};

describe('progressLogs', () => {
  it('turns server rows into the app shape', () => {
    expect(normalizeServerLogs([serverRow], stages)[0]).toEqual({
      id: '4', cycleId: '32', logDate: '2026-10-29', growthStage: 'Tillering',
      observedIssue: 'Disease', severity: 'Low', actionTaken: '', notes: 'Tillering · Disease', resolvedAt: null,
    });
  });

  it('only accepts logs in the app shape', () => {
    expect(isAppLog(normalizeServerLogs([serverRow], stages)[0])).toBe(true);
    expect(isAppLog(serverRow)).toBe(false);   // raw rows rendered as blank, duplicate-key rows
  });

  it('keeps local-only logs and the local copy of shared ones, and drops raw rows', () => {
    const server = normalizeServerLogs([{ ...serverRow, id: 2, issue_type: 'weather' }], stages);
    const local = [
      { id: '2', logDate: '2026-10-28', observedIssue: 'Flood' },   // same log, phone knows it was a flood
      { id: 'log_1', logDate: '2026-10-27', observedIssue: 'Insect' },
      serverRow,                                                       // saved by an older build
    ];
    const merged = mergeLogs(server, local, 32);
    expect(merged.map(l => l.id)).toEqual(['2', 'log_1']);
    expect(merged[0].observedIssue).toBe('Flood');
  });

  it('lets the server decide whether a problem is fixed', () => {
    const server = normalizeServerLogs([{ ...serverRow, resolved_at: '2026-11-09T01:00:00Z' }], stages);
    const merged = mergeLogs(server, [{ id: '4', cycleId: '32', logDate: '2026-10-29', resolvedAt: null }], 32);
    expect(merged[0].resolvedAt).toBe('2026-11-09T01:00:00Z');
  });

  it('never keeps a log from another crop cycle', () => {
    const server = normalizeServerLogs([serverRow], stages);
    const local = [
      { id: '9', cycleId: '77', logDate: '2026-10-20' },    // another farm's cycle
      { id: '10', cycleId: '32', logDate: '2026-10-21' },   // this cycle, not on the server yet
      { id: 'log_1', cycleId: null, logDate: '2026-10-22' },   // saved with no cycle
    ];
    expect(mergeLogs(server, local, 32).map(l => l.id)).toEqual(['4', '10', 'log_1']);
  });

  it('shows no logs from another farm on a farm with no crop cycle', () => {
    expect(mergeLogs([], [{ id: '9', cycleId: '77', logDate: '2026-10-20' }], null)).toEqual([]);
  });
});
