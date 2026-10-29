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
      observedIssue: 'Disease', severity: 'Low', actionTaken: '', notes: 'Tillering · Disease',
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
    const merged = mergeLogs(server, local);
    expect(merged.map(l => l.id)).toEqual(['2', 'log_1']);
    expect(merged[0].observedIssue).toBe('Flood');
  });
});
