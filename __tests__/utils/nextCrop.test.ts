import { guideStageNo } from '@/utils/guideSteps';
import { hasFarmerDescription } from '@/utils/progressLogs';
import { cropIsOver, nextCropParams } from '@/utils/nextCrop';

describe('nextCropParams', () => {
  it('reuses the existing farm instead of creating a new one', () => {
    const farm = { id: 7, name: 'Kurt Farm', barangay: 'Santo Niño', area_hectares: 4, ecosystem: 'upland', latitude: 7.3, longitude: 125.6 };
    const params = nextCropParams(farm);
    expect(params.existingFarm).toBe(farm);
    expect(params.farmData).toMatchObject({ farmName: 'Kurt Farm', barangay: 'Santo Niño', area: '4', ecosystem: 'upland' });
  });
});

describe('cropIsOver', () => {
  it('is over once harvested or given up', () => {
    expect(cropIsOver({ status: 'completed' })).toBe(true);
    expect(cropIsOver({ status: 'abandoned' })).toBe(true);
  });
  it('is not over while growing, or before the crop has loaded', () => {
    expect(cropIsOver({ status: 'active' })).toBe(false);
    expect(cropIsOver(null)).toBe(false);
  });
});

describe('guideStageNo', () => {
  const step = (id: string, key: string) => ({ id, key }) as any;
  const steps = [step('a', 'seeds'), step('b', 'seedbed'), step('c', 'transplant'), step('d', 'fertilizer1'), step('e', 'harvest')];
  it('has no answer without a guide', () => expect(guideStageNo([], [])).toBeNull());
  it('stays at the first stage until a later step is logged', () => {
    expect(guideStageNo(steps, [])).toBe(1);
    expect(guideStageNo(steps, ['a', 'b'])).toBe(1);
  });
  it('follows the furthest step logged', () => {
    expect(guideStageNo(steps, ['a', 'b', 'c', 'd'])).toBe(3);
    expect(guideStageNo(steps, ['e'])).toBe(9);
  });
});

describe('guideStageNo with the crop\'s age', () => {
  const step = (id: string, key: string) => ({ id, key }) as any;
  const steps = [step('a', 'seedbed'), step('b', 'fertilizerpi'), step('c', 'flowering'), step('d', 'drain')];
  it('moves through a stage that has no guide step', () => {
    expect(guideStageNo(steps, ['a', 'b'], 5)).toBe(5);
    expect(guideStageNo(steps, ['a', 'b', 'c'], 7)).toBe(7);
  });
  it('never passes the next step still to log', () => {
    expect(guideStageNo(steps, ['a', 'b'], 8)).toBe(5);
    expect(guideStageNo(steps, [], 8)).toBe(3);
  });
});

describe('hasFarmerDescription', () => {
  it('ignores the text the app makes up', () => {
    expect(hasFarmerDescription('Tillering · Insect')).toBe(false);
    expect(hasFarmerDescription('Insect')).toBe(false);
    expect(hasFarmerDescription('')).toBe(false);
  });
  it('accepts what the farmer wrote', () => {
    expect(hasFarmerDescription('Small black bugs at the base of the stems')).toBe(true);
  });
});
