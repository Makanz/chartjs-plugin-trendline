import { LineFitter } from './lineFitter';

describe('LineFitter', () => {
  test('constructor should initialize values correctly', () => {
    const fitter = new LineFitter();
    expect(fitter.count).toBe(0);
    expect(fitter.sumx).toBe(0);
    expect(fitter.sumy).toBe(0);
    expect(fitter.sumx2).toBe(0);
    expect(fitter.sumxy).toBe(0);
  });

  test('add method should update values correctly', () => {
    const fitter = new LineFitter();
    fitter.add(1, 2);
    expect(fitter.count).toBe(1);
    expect(fitter.sumx).toBe(1);
    expect(fitter.sumy).toBe(2);
    expect(fitter.sumx2).toBe(1);
    expect(fitter.sumxy).toBe(2);

    fitter.add(3, 4);
    expect(fitter.count).toBe(2);
    expect(fitter.sumx).toBe(1 + 3);
    expect(fitter.sumy).toBe(2 + 4);
    expect(fitter.sumx2).toBe(1 * 1 + 3 * 3);
    expect(fitter.sumxy).toBe(1 * 2 + 3 * 4);
  });

  describe('slope', () => {
    test('should return NaN if count is 0', () => {
      const fitter = new LineFitter();
      expect(fitter.slope()).toBeNaN();
    });

    test('should return NaN if count is 1', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1);
      expect(fitter.slope()).toBeNaN();
    });

    test('should calculate slope correctly for 2 points', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1);
      fitter.add(2, 2);
      expect(fitter.slope()).toBe(1);
    });

    test('should return 0 for a horizontal line', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1);
      fitter.add(2, 1);
      expect(fitter.slope()).toBe(0);
    });

    test('should return NaN for a vertical line (all x are same)', () => {
      // Denominator: count * sumx2 - sumx * sumx
      // If all x are x_c: count * (count * x_c^2) - (count * x_c)^2 = 0
      // Numerator: count * sumxy - sumx * sumy
      // If all x are x_c: count * (x_c * sumy) - (count * x_c) * sumy = 0
      // So, 0/0 = NaN
      const fitter = new LineFitter();
      fitter.add(1, 1);
      fitter.add(1, 2);
      expect(fitter.slope()).toBeNaN();
    });

    test('should return NaN for a vertical line (points added in decreasing y order, all x same)', () => {
      const fitter = new LineFitter();
      fitter.add(1, 2);
      fitter.add(1, 1);
      expect(fitter.slope()).toBeNaN();
    });
  });

  describe('intercept', () => {
    test('should return NaN if count is 0', () => {
      const fitter = new LineFitter();
      expect(fitter.intercept()).toBeNaN();
    });

    test('should return NaN if count is 1', () => {
      const fitter = new LineFitter();
      fitter.add(1, 5);
      expect(fitter.intercept()).toBeNaN();
    });

    test('should calculate intercept correctly for 2 points', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1); // y = x, intercept should be 0
      fitter.add(2, 2);
      expect(fitter.intercept()).toBe(0);

      const fitter2 = new LineFitter();
      fitter2.add(1, 2); // y = x + 1, intercept should be 1
      fitter2.add(2, 3);
      expect(fitter2.intercept()).toBe(1);
    });

    test('should calculate intercept for a horizontal line', () => {
      const fitter = new LineFitter();
      fitter.add(1, 5);
      fitter.add(2, 5);
      expect(fitter.intercept()).toBe(5);
    });

    test('should calculate intercept for a vertical line', () => {
      // As established, slope for a vertical line (all x same) is NaN.
      // intercept = (sumy - slope * sumx) / count = (sumy - NaN * sumx) / count = NaN
      const fitter = new LineFitter();
      fitter.add(1, 1); // x=1, slope is NaN
      fitter.add(1, 2);
      expect(fitter.intercept()).toBeNaN();


      const fitter2 = new LineFitter();
      fitter2.add(1, 2); // x=1, slope is NaN
      fitter2.add(1, 1);
      expect(fitter2.intercept()).toBeNaN();
    });
  });

  describe('f', () => {
    test('should return NaN if count is 0', () => {
      const fitter = new LineFitter();
      expect(fitter.f(10)).toBeNaN();
    });

    test('should return NaN if count is 1', () => {
      const fitter = new LineFitter();
      fitter.add(2, 5);
      expect(fitter.f(10)).toBeNaN();
    });

    test('should predict y values correctly', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1); // y = x
      fitter.add(2, 2);
      expect(fitter.f(3)).toBe(3);
      expect(fitter.f(0)).toBe(0);

      const fitter2 = new LineFitter();
      fitter2.add(0, 1); // y = 2x + 1
      fitter2.add(1, 3);
      expect(fitter2.f(2)).toBe(5);
      expect(fitter2.f(-1)).toBe(-1);
    });

    test('should predict y values for a horizontal line', () => {
      const fitter = new LineFitter();
      fitter.add(1, 5);
      fitter.add(2, 5); // y = 5
      expect(fitter.f(10)).toBe(5);
      expect(fitter.f(-10)).toBe(5);
    });

    test('should predict y values for a vertical line', () => {
      // slope is NaN for vertical line, intercept is NaN.
      // f(x) = NaN * x + NaN = NaN
      const fitter = new LineFitter();
      fitter.add(1, 1); // x = 1. slope = NaN
      fitter.add(1, 3); 
      expect(fitter.f(1)).toBeNaN();
      expect(fitter.f(2)).toBeNaN();
      expect(fitter.f(0)).toBeNaN();


      const fitter2 = new LineFitter();
      fitter2.add(1, 3); // x = 1. slope = NaN
      fitter2.add(1, 1); 
      expect(fitter2.f(1)).toBeNaN();
      expect(fitter2.f(2)).toBeNaN();
      expect(fitter2.f(0)).toBeNaN();
    });
  });

  describe('fo (x-intercept)', () => {
    test('should return NaN if count is 0', () => {
      const fitter = new LineFitter();
      expect(fitter.fo()).toBeNaN();
    });

    test('should return NaN if count is 1', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1);
      expect(fitter.fo()).toBeNaN();
    });

    test('should calculate x-intercept correctly for a sloped line', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1); // y = x. Slope = 1, Intercept = 0.
      fitter.add(2, 2); // x-intercept = -0/1 = 0
      expect(fitter.fo()).toBeCloseTo(0);

      const fitter2 = new LineFitter();
      fitter2.add(1, 0); // y = x - 1. Slope = 1, Intercept = -1
      fitter2.add(2, 1); // x-intercept = -(-1)/1 = 1
      expect(fitter2.fo()).toBeCloseTo(1);

      const fitter3 = new LineFitter();
      fitter3.add(0, 2); // y = -x + 2. Slope = -1, Intercept = 2
      fitter3.add(1, 1); // x-intercept = -2/(-1) = 2
      expect(fitter3.fo()).toBeCloseTo(2);
    });

    test('should handle horizontal line (y=c, c!=0)', () => {
      const fitter = new LineFitter();
      fitter.add(1, 2); // y = 2. Slope = 0, Intercept = 2.
      fitter.add(2, 2); // x-intercept = -2/0 = -Infinity
      expect(fitter.fo()).toBe(-Infinity);
    });

    test('should handle horizontal line (y=0)', () => {
      const fitter = new LineFitter();
      fitter.add(1, 0); // y = 0. Slope = 0, Intercept = 0.
      fitter.add(2, 0); // x-intercept = -0/0 = NaN
      expect(fitter.fo()).toBeNaN();
    });

    test('should return NaN for a vertical line (slope is NaN)', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1); // x = 1. Slope = NaN 
      fitter.add(1, 2); // intercept = NaN
      expect(fitter.fo()).toBeNaN(); // -NaN/NaN = NaN

      const fitter2 = new LineFitter();
      fitter2.add(1, 2); // x = 1. Slope = NaN
      fitter2.add(1, 1); // intercept = NaN
      expect(fitter2.fo()).toBeNaN(); 
    });
  });

  describe('scale', () => {
    test('should return NaN if count is 0', () => {
      const fitter = new LineFitter();
      expect(fitter.scale()).toBeNaN();
    });

    test('should return NaN if count is 1', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1);
      expect(fitter.scale()).toBeNaN();
    });

    test('should return the same as slope() for 2 or more points', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1);
      fitter.add(2, 2); // Slope = 1
      expect(fitter.scale()).toBe(fitter.slope());
      expect(fitter.scale()).toBe(1);

      const fitter2 = new LineFitter();
      fitter2.add(1, 1);
      fitter2.add(2, 1); // Slope = 0 (horizontal)
      expect(fitter2.scale()).toBe(fitter2.slope());
      expect(fitter2.scale()).toBe(0);

      const fitter3 = new LineFitter();
      fitter3.add(1, 1);
      fitter3.add(1, 2); // Slope = NaN (vertical)
      expect(fitter3.scale()).toBe(fitter3.slope());
      expect(fitter3.scale()).toBeNaN();
    });
  });

  describe('caching behavior', () => {
    test('should cache slope and intercept calculations', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1);
      fitter.add(2, 2);
      
      // First call should compute and cache
      const slope1 = fitter.slope();
      const intercept1 = fitter.intercept();
      
      // Subsequent calls should return cached values
      const slope2 = fitter.slope();
      const intercept2 = fitter.intercept();
      
      expect(slope1).toBe(slope2);
      expect(intercept1).toBe(intercept2);
      expect(slope1).toBe(1);
      expect(intercept1).toBe(0);
      
      // Check that cache is populated
      expect(fitter._cachedSlope).toBe(1);
      expect(fitter._cachedIntercept).toBe(0);
      expect(fitter._cacheValid).toBe(true);
    });

    test('should invalidate cache when new data is added', () => {
      const fitter = new LineFitter();
      fitter.add(1, 1);
      fitter.add(2, 2);
      
      // Cache should be valid after first calculation
      fitter.slope();
      expect(fitter._cacheValid).toBe(true);
      
      // Adding new data should invalidate cache
      fitter.add(3, 4);
      expect(fitter._cacheValid).toBe(false);
      
      // New calculation should work with updated data
      const newSlope = fitter.slope();
      expect(newSlope).toBeCloseTo(1.5, 5); // New slope with data [1,1], [2,2], [3,4]
      expect(fitter._cacheValid).toBe(true);
    });

    test('should handle multiple method calls efficiently with caching', () => {
      const fitter = new LineFitter();
      fitter.add(0, 1);
      fitter.add(1, 3);
      fitter.add(2, 5); // y = 2x + 1
      
      // Simulate multiple calls like in trendline.js
      const slope1 = fitter.slope();
      const intercept1 = fitter.intercept(); // This used to call slope() again
      const f1 = fitter.f(3); // This calls both slope() and intercept()
      const slope2 = fitter.slope(); // Another direct call
      
      expect(slope1).toBe(2);
      expect(slope2).toBe(2);
      expect(intercept1).toBe(1);
      expect(f1).toBe(7); // 2*3 + 1 = 7
      
      // All should use cached values
      expect(fitter._cachedSlope).toBe(2);
      expect(fitter._cachedIntercept).toBe(1);
      expect(fitter._cacheValid).toBe(true);
    });

    test('should initialize cache properties correctly', () => {
      const fitter = new LineFitter();
      expect(fitter._cachedSlope).toBe(null);
      expect(fitter._cachedIntercept).toBe(null);
      expect(fitter._cacheValid).toBe(false);
    });
  });
});
