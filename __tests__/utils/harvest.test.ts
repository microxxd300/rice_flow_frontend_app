import { harvestFigures } from '@/utils/harvest';

describe('harvestFigures', () => {
  it('counts dried palay as it is', () => {
    expect(harvestFigures(100, 50, 1, 14)).toEqual({
      totalKg: 5000, dryKg: 5000, tHa: 5, cavansHa: 100, unusual: false, impossible: false,
    });
  });

  it('brings fresh palay to 14% moisture, the DA basis', () => {
    const fresh = harvestFigures(120, 50, 1.2, 22)!;
    expect(fresh.totalKg).toBe(6000);
    expect(fresh.dryKg).toBe(Math.round(6000 * 78 / 86));      // 5442 kg dry
    expect(fresh.tHa).toBeCloseTo(4.53, 2);
  });

  it('flags numbers far from the usual yields', () => {
    expect(harvestFigures(1600, 50, 1, 14)!.unusual).toBe(true);   // 80 t/ha: a typo
    expect(harvestFigures(10, 50, 2, 14)!.unusual).toBe(true);     // 0.25 t/ha
    expect(harvestFigures(1600, 50, 1, 14)!.impossible).toBe(true);
    expect(harvestFigures(300, 50, 1, 14)!.impossible).toBe(false);   // 15 t/ha: unusual, but allowed
  });

  it('needs sacks, their weight and the area', () => {
    expect(harvestFigures(0, 50, 1, 14)).toBeNull();
    expect(harvestFigures(100, 50, 0, 14)).toBeNull();
  });
});
