import { calculateMissionAdjustment, calculateServicePoints, calculateServiceScore } from './customer-service.service';

describe('customer service scoring rules', () => {
  it('weights customer outcome highest', () => {
    expect(calculateServiceScore([100, 80])).toBe(92);
    expect(calculateServiceScore([80, 100])).toBe(88);
  });

  it.each([
    [90, 150],
    [80, 120],
    [70, 100],
    [69, 0],
  ])('converts score %i to the configured point tier', (score, expected) => {
    expect(calculateServicePoints(100, score)).toBe(expected);
  });

  it('adjusts linked mission points by quality score', () => {
    expect(calculateMissionAdjustment(600, 92)).toBe(120);
    expect(calculateMissionAdjustment(600, 65)).toBe(-120);
  });
});
