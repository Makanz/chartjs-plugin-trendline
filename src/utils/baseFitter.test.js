import { BaseFitter } from './baseFitter.js';

describe('BaseFitter', () => {
  test('constructor should initialize counters and min/max', () => {
    const fitter = new BaseFitter();
    expect(fitter.count).toBe(0);
    expect(fitter.sumx).toBe(0);
    expect(fitter.sumx2).toBe(0);
    expect(fitter.minx).toBe(Number.MAX_VALUE);
    expect(fitter.maxx).toBe(Number.MIN_VALUE);
    expect(fitter._cacheValid).toBe(false);
  });

  test('add() accumulates x, x^2, count and min/max', () => {
    const fitter = new BaseFitter();
    fitter.add(2);
    fitter.add(5);
    fitter.add(-1);

    expect(fitter.count).toBe(3);
    expect(fitter.sumx).toBe(6);
    expect(fitter.sumx2).toBe(30);
    expect(fitter.minx).toBe(-1);
    expect(fitter.maxx).toBe(5);
  });

  test('add() invalidates the coefficient cache', () => {
    const fitter = new BaseFitter();
    fitter._cacheValid = true;
    fitter.add(1);
    expect(fitter._cacheValid).toBe(false);
  });

  test('scale() defaults to 0', () => {
    expect(new BaseFitter().scale()).toBe(0);
  });
});
