import { plantingCalendar } from '@/utils/plantingCalendar';

const flat = (mm: number) => Array(12).fill(mm);

describe('plantingCalendar', () => {
  it('marks steady moderate rain safe all year', () => {
    expect(plantingCalendar(flat(220)).every(m => m.status === 'safe')).toBe(true);
  });

  it('flags flood risk when the growing window is very wet', () => {
    const rain = flat(200);
    rain[5] = rain[6] = rain[7] = rain[8] = 500;          // Jun–Sep downpours
    const cal = plantingCalendar(rain, { maturityDays: 110 });
    expect(cal[5]).toMatchObject({ status: 'danger', reason: 'flood' });   // grows Jun–Sep
    expect(cal[0].status).toBe('safe');                                   // grows Jan–Apr
  });

  it('flags drought only for rain-dependent crops', () => {
    const dry = flat(80);
    expect(plantingCalendar(dry, { ecosystem: 'rainfed_lowland' })[0]).toMatchObject({ status: 'danger', reason: 'drought' });
    expect(plantingCalendar(dry, { ecosystem: 'irrigated_lowland' })[0].status).toBe('safe');
  });

  it('is stricter on flood-prone farms', () => {
    const rain = flat(360);   // danger line: 400 mm on low-risk farms, 350 mm on high-risk ones
    expect(plantingCalendar(rain, { floodRisk: 'Low' })[0].status).toBe('caution');
    expect(plantingCalendar(rain, { floodRisk: 'High' })[0].status).toBe('danger');
  });

  it('makes months outside the variety season one level riskier', () => {
    const cal = plantingCalendar(flat(220), { varietySeason: 'wet' });
    expect(cal[0]).toMatchObject({ status: 'caution', reason: 'off_season' });  // January
    expect(cal[6].status).toBe('safe');                                          // July
  });
});
