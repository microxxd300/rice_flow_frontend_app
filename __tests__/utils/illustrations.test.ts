import { growthStages, icons, stageImage, stepIcon } from '@/assets/illustrations';

describe('illustrations', () => {
  it('has a picture for each of the 10 server growth stages, in order', () => {
    expect(growthStages).toHaveLength(10);
    expect(stageImage(1)).toBe(growthStages[0].image);
    expect(stageImage(10)).toBe(growthStages[9].image);
  });

  it('has no picture outside stages 1..10', () => {
    expect(stageImage(0)).toBeNull();
    expect(stageImage(11)).toBeNull();
    expect(stageImage(null)).toBeNull();
  });

  it("gives each PalayCheck step kind its icon, planting otherwise", () => {
    expect(stepIcon('pest_prevention')).toBe(icons.pest);
    expect(stepIcon('harvesting')).toBe(icons.harvest);
    expect(stepIcon('fertilizer')).toBe(icons.fertilizer);
    expect(stepIcon('irrigation')).toBe(icons.irrigation);
    expect(stepIcon('something_new')).toBe(icons.planting);
  });
});
