import { STAGE_NO, stageLabel } from '@/utils/progressLogs';

describe('stageLabel', () => {
  it('names every server stage, so the log form can fill it in', () => {
    for (let no = 1; no <= 10; no++) expect(STAGE_NO[stageLabel(no)]).toBe(no);
    expect(stageLabel(3)).toBe('Tillering');
    expect(stageLabel(9)).toBe('Harvesting');
  });

  it('is empty without a stage', () => {
    expect(stageLabel(undefined)).toBe('');
    expect(stageLabel(42)).toBe('');
  });
});
