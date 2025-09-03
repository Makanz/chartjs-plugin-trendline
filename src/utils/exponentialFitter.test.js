import { ExponentialFitter } from './exponentialFitter';

describe('ExponentialFitter', () => {
  describe('constructor', () => {
    test('should initialize with default values', () => {
      const fitter = new ExponentialFitter();
      expect(fitter.count).toBe(0);
      expect(fitter.sumx).toBe(0);
      expect(fitter.sumlny).toBe(0);
      expect(fitter.sumx2).toBe(0);
      expect(fitter.sumxlny).toBe(0);
      expect(fitter.minx).toBe(Number.MAX_VALUE);
      expect(fitter.maxx).toBe(Number.MIN_VALUE);
      expect(fitter.hasValidData).toBe(true);
    });
  });

  describe('add', () => {
    test('should add valid positive points correctly', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);
      fitter.add(1, 2);
      fitter.add(2, 4);
      
      expect(fitter.count).toBe(3);
      expect(fitter.hasValidData).toBe(true);
      expect(fitter.minx).toBe(0);
      expect(fitter.maxx).toBe(2);
    });

    test('should reject negative y values', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, -1);
      expect(fitter.hasValidData).toBe(false);
      expect(fitter.count).toBe(0);
    });

    test('should reject zero y values', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 0);
      expect(fitter.hasValidData).toBe(false);
      expect(fitter.count).toBe(0);
    });

    test('should handle infinite logarithm values', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, Infinity);
      expect(fitter.hasValidData).toBe(false);
      expect(fitter.count).toBe(0);
    });
  });

  describe('exponential fitting', () => {
    test('should fit perfect exponential growth y = 2^x', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);   // 2^0 = 1
      fitter.add(1, 2);   // 2^1 = 2
      fitter.add(2, 4);   // 2^2 = 4
      fitter.add(3, 8);   // 2^3 = 8
      
      // For y = 2^x, we have y = e^(ln(2)*x)
      // So coefficient should be ~1 and growth rate should be ~ln(2) ≈ 0.693
      expect(fitter.coefficient()).toBeCloseTo(1, 3);
      expect(fitter.growthRate()).toBeCloseTo(Math.log(2), 3);
    });

    test('should fit exponential decay y = e^(-x)', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);                    // e^0 = 1
      fitter.add(1, Math.exp(-1));         // e^(-1) ≈ 0.368
      fitter.add(2, Math.exp(-2));         // e^(-2) ≈ 0.135
      fitter.add(3, Math.exp(-3));         // e^(-3) ≈ 0.050
      
      expect(fitter.coefficient()).toBeCloseTo(1, 3);
      expect(fitter.growthRate()).toBeCloseTo(-1, 3);
    });

    test('should fit exponential with coefficient y = 3*e^(0.5*x)', () => {
      const fitter = new ExponentialFitter();
      const a = 3;
      const b = 0.5;
      
      for (let x = 0; x <= 4; x++) {
        const y = a * Math.exp(b * x);
        fitter.add(x, y);
      }
      
      expect(fitter.coefficient()).toBeCloseTo(a, 3);
      expect(fitter.growthRate()).toBeCloseTo(b, 3);
    });
  });

  describe('f', () => {
    test('should return correct fitted values for exponential function', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);
      fitter.add(1, 2);
      fitter.add(2, 4);
      fitter.add(3, 8);
      
      expect(fitter.f(0)).toBeCloseTo(1, 2);
      expect(fitter.f(1)).toBeCloseTo(2, 2);
      expect(fitter.f(2)).toBeCloseTo(4, 2);
      expect(fitter.f(3)).toBeCloseTo(8, 2);
      expect(fitter.f(4)).toBeCloseTo(16, 2);
    });

    test('should return 0 for invalid data', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, -1); // This makes hasValidData false
      
      expect(fitter.f(1)).toBe(0);
    });

    test('should return 0 for insufficient data', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1); // Only one point
      
      expect(fitter.f(1)).toBe(0);
    });
  });

  describe('growthRate and coefficient', () => {
    test('should return 0 and 1 respectively for invalid data', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, -1);
      
      expect(fitter.growthRate()).toBe(0);
      expect(fitter.coefficient()).toBe(1);
    });

    test('should return 0 and 1 respectively for insufficient data', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);
      
      expect(fitter.growthRate()).toBe(0);
      expect(fitter.coefficient()).toBe(1);
    });

    test('should handle degenerate case with same x values', () => {
      const fitter = new ExponentialFitter();
      fitter.add(1, 2);
      fitter.add(1, 4);
      fitter.add(1, 8);
      
      expect(fitter.growthRate()).toBe(0);
    });
  });

  describe('scale', () => {
    test('should return the growth rate', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);
      fitter.add(1, 2);
      fitter.add(2, 4);
      
      expect(fitter.scale()).toBe(fitter.growthRate());
    });
  });

  describe('correlation', () => {
    test('should return 0 for invalid data', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, -1);
      
      expect(fitter.correlation()).toBe(0);
    });

    test('should return 0 for insufficient data', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);
      
      expect(fitter.correlation()).toBe(0);
    });

    test('should return a value between 0 and 1', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);
      fitter.add(1, 2);
      fitter.add(2, 4);
      fitter.add(3, 8);
      
      const correlation = fitter.correlation();
      expect(correlation).toBeGreaterThanOrEqual(0);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    test('should return high correlation for perfect exponential data', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);   // 2^0 = 1
      fitter.add(1, 2);   // 2^1 = 2
      fitter.add(2, 4);   // 2^2 = 4
      fitter.add(3, 8);   // 2^3 = 8
      
      const correlation = fitter.correlation();
      expect(correlation).toBeGreaterThan(0.99); // Perfect exponential should have very high R²
    });

    test('should return lower correlation for noisy exponential data', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1.5);   // More noisy data to ensure lower correlation
      fitter.add(1, 1.8);
      fitter.add(2, 5.2);
      fitter.add(3, 6.1);
      
      const correlation = fitter.correlation();
      expect(correlation).toBeGreaterThan(0.5);  // Still reasonable correlation
      expect(correlation).toBeLessThan(0.95);    // But not perfect
    });
  });

  describe('edge cases', () => {
    test('should handle very large values', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);
      fitter.add(1, 10);
      fitter.add(2, 100);
      
      expect(fitter.hasValidData).toBe(true);
      expect(fitter.f(0)).toBeCloseTo(1, 1);
      expect(fitter.f(1)).toBeCloseTo(10, 1);
    });

    test('should handle very small positive values', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 0.001);
      fitter.add(1, 0.01);
      fitter.add(2, 0.1);
      
      expect(fitter.hasValidData).toBe(true);
      expect(fitter.f(0)).toBeCloseTo(0.001, 3);
    });

    test('should handle overflow gracefully', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);
      fitter.add(1, 2);
      fitter.add(2, 4);
      
      // For this data, growth rate is ln(2) ≈ 0.693
      // So 1000 * 0.693 = 693, which should trigger overflow protection
      const result = fitter.f(1000);
      expect(result).toBe(0); // Should return 0 when overflow occurs
      
      // Test a smaller but still large value that should work
      const smallerResult = fitter.f(10);
      expect(smallerResult).toBeGreaterThan(0);
      expect(smallerResult).toBeLessThan(Infinity);
    });
  });

  describe('caching behavior', () => {
    test('should cache coefficient, growth rate, and correlation calculations', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);
      fitter.add(1, 2);
      fitter.add(2, 4);
      
      // First calls should compute and cache
      const growthRate1 = fitter.growthRate();
      const coefficient1 = fitter.coefficient();
      const correlation1 = fitter.correlation();
      
      // Subsequent calls should return cached values
      const growthRate2 = fitter.growthRate();
      const coefficient2 = fitter.coefficient();
      const correlation2 = fitter.correlation();
      
      expect(growthRate1).toBe(growthRate2);
      expect(coefficient1).toBe(coefficient2);
      expect(correlation1).toBe(correlation2);
      
      // Check that cache is populated
      expect(fitter._cachedGrowthRate).toBeCloseTo(Math.log(2), 3);
      expect(fitter._cachedCoefficient).toBeCloseTo(1, 3);
      expect(fitter._cachedCorrelation).toBeGreaterThan(0.99);
      expect(fitter._cacheValid).toBe(true);
    });

    test('should invalidate cache when new data is added', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1);
      fitter.add(1, 2);
      
      // Cache should be valid after first calculation
      fitter.growthRate();
      expect(fitter._cacheValid).toBe(true);
      
      // Adding new data should invalidate cache
      fitter.add(2, 8); // This changes the exponential curve
      expect(fitter._cacheValid).toBe(false);
      
      // New calculation should work with updated data
      const newGrowthRate = fitter.growthRate();
      expect(newGrowthRate).toBeGreaterThan(Math.log(2)); // Should be higher with [0,1], [1,2], [2,8]
      expect(fitter._cacheValid).toBe(true);
    });

    test('should handle multiple method calls efficiently with caching', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 2);
      fitter.add(1, 4);
      fitter.add(2, 8); // y = 2 * 2^x
      
      // Simulate multiple calls like in trendline.js
      const coefficient1 = fitter.coefficient();
      const growthRate1 = fitter.growthRate();
      const f1 = fitter.f(3); // This calls both coefficient() and growthRate()
      const coefficient2 = fitter.coefficient(); // Another direct call
      const correlation1 = fitter.correlation();
      
      expect(coefficient1).toBeCloseTo(2, 3);
      expect(coefficient2).toBeCloseTo(2, 3);
      expect(growthRate1).toBeCloseTo(Math.log(2), 3);
      expect(f1).toBeCloseTo(16, 3); // 2 * 2^3 = 16
      expect(correlation1).toBeGreaterThan(0.99);
      
      // All should use cached values
      expect(fitter._cachedCoefficient).toBeCloseTo(2, 3);
      expect(fitter._cachedGrowthRate).toBeCloseTo(Math.log(2), 3);
      expect(fitter._cachedCorrelation).toBeGreaterThan(0.99);
      expect(fitter._cacheValid).toBe(true);
    });

    test('should initialize cache properties correctly', () => {
      const fitter = new ExponentialFitter();
      expect(fitter._cachedGrowthRate).toBe(null);
      expect(fitter._cachedCoefficient).toBe(null);
      expect(fitter._cachedCorrelation).toBe(null);
      expect(fitter._cacheValid).toBe(false);
    });

    test('should handle caching with invalid data correctly', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, -1); // Invalid data
      
      // Should return default values without caching (early return)
      const growthRate = fitter.growthRate();
      const coefficient = fitter.coefficient();
      const correlation = fitter.correlation();
      
      expect(growthRate).toBe(0);
      expect(coefficient).toBe(1);
      expect(correlation).toBe(0);
      expect(fitter._cacheValid).toBe(false); // Cache not set for invalid data
    });

    test('should handle caching with insufficient data correctly', () => {
      const fitter = new ExponentialFitter();
      fitter.add(0, 1); // Only one point
      
      // Should return default values without caching (early return)
      const growthRate = fitter.growthRate();
      const coefficient = fitter.coefficient();
      const correlation = fitter.correlation();
      
      expect(growthRate).toBe(0);
      expect(coefficient).toBe(1);
      expect(correlation).toBe(0);
      expect(fitter._cacheValid).toBe(false); // Cache not set for insufficient data
    });
  });
});