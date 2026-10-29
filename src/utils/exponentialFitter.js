import { BaseFitter } from './baseFitter.js';

/**
 * A class that fits an exponential curve to a series of points using least squares.
 * Fits y = a * e^(b*x) by transforming to ln(y) = ln(a) + b*x
 */
export class ExponentialFitter extends BaseFitter {
    constructor() {
        super();
        this.sumlny = 0;
        this.sumxlny = 0;
        this.hasValidData = true;
        this.sumlny2 = 0;

        // Running (Welford) moments about the mean, for x and ln(y). The
        // textbook sums cancel away every significant digit once x is an
        // epoch-millisecond value: on a time scale the spread over seconds or
        // minutes is about 1e-6 of the magnitude of x, so `count * sumx2 -
        // sumx * sumx` subtracts two nearly equal ~1e30 numbers. LineFitter
        // keeps the same moments for the same reason.
        this._meanx = 0;
        this._meanlny = 0;
        this._m2x = 0;
        this._cxy = 0;
        this._m2lny = 0;

        this._cachedGrowthRate = null;
        this._cachedCoefficient = null;
        this._cachedCorrelation = null;
    }

    /**
     * Adds a point to the exponential fitter.
     * @param {number} x - The x-coordinate of the point.
     * @param {number} y - The y-coordinate of the point.
     */
    add(x, y) {
        if (y <= 0) {
            this.hasValidData = false;
            return;
        }

        const lny = Math.log(y);
        if (!isFinite(lny)) {
            this.hasValidData = false;
            return;
        }

        super.add(x);
        this.sumlny += lny;
        this.sumxlny += x * lny;
        this.sumlny2 += lny * lny;

        const count = this.count;
        const deltaX = x - this._meanx;
        this._meanx += deltaX / count;
        const deltaLny = lny - this._meanlny;
        this._meanlny += deltaLny / count;
        this._m2x += deltaX * (x - this._meanx);
        this._cxy += deltaX * (lny - this._meanlny);
        this._m2lny += deltaLny * (lny - this._meanlny);
    }

    /**
     * Calculates the exponential growth rate (b in y = a * e^(b*x)).
     * @returns {number} - The exponential growth rate.
     */
    growthRate() {
        if (!this.hasValidData || this.count < 2) return 0;
        if (!this._cacheValid) {
            this._computeCoefficients();
        }
        return this._cachedGrowthRate;
    }

    /**
     * Calculates the exponential coefficient (a in y = a * e^(b*x)).
     * @returns {number} - The exponential coefficient.
     */
    coefficient() {
        if (!this.hasValidData || this.count < 2) return 1;
        if (!this._cacheValid) {
            this._computeCoefficients();
        }
        return this._cachedCoefficient;
    }

    /**
     * Returns the fitted exponential value (y) for a given x.
     * @param {number} x - The x-coordinate.
     * @returns {number} - The corresponding y-coordinate on the fitted exponential curve.
     */
    f(x) {
        if (!this.hasValidData || this.count < 2) return 0;
        if (!this._cacheValid) {
            this._computeCoefficients();
        }

        // Evaluate about the mean x rather than as a * e^(b*x): with an
        // epoch-millisecond x, b * x is ~1e4 even though the curve only spans a
        // few percent, so the absolute form trips the guard below on ordinary
        // data and exp(ln a) has underflowed to 0 by the time it is multiplied.
        // b * (x - meanx) is the size of the curve, whatever the magnitude of x.
        const exponent = this._cachedGrowthRate * (x - this._meanx);
        if (!isFinite(exponent) || Math.abs(exponent) > 500) return 0; // Safer limit to prevent overflow

        const result = Math.exp(this._meanlny + exponent);
        return isFinite(result) ? result : 0;
    }

    /**
     * Calculates the correlation coefficient (R-squared) for the exponential fit.
     * @returns {number} - The correlation coefficient (0-1).
     */
    correlation() {
        if (!this.hasValidData || this.count < 2) return 0;
        if (!this._cacheValid) {
            this._computeCoefficients();
        }
        return this._cachedCorrelation;
    }

    /**
     * Returns the scale (growth rate) of the fitted exponential curve.
     * @returns {number} - The growth rate of the exponential curve.
     */
    scale() {
        return this.growthRate();
    }

    _computeCoefficients() {
        if (!this.hasValidData || this.count < 2) {
            this._cachedGrowthRate = 0;
            this._cachedCoefficient = 1;
            this._cachedCorrelation = 0;
            this._cacheValid = true;
            return;
        }

        // Degenerate input: every x is identical, so there is no x spread to
        // regress on. Fall back to the constant that least squares in log space
        // gives for b = 0 — the geometric mean of y — instead of dividing by
        // zero. Detected on the centred sum of squares, where it is exact.
        if (!(this._m2x > 0)) {
            this._cachedGrowthRate = 0;
            this._cachedCoefficient = Math.exp(this._meanlny);
            this._cachedCorrelation = 0;
            this._cacheValid = true;
            return;
        }

        this._cachedGrowthRate = this._cxy / this._m2x;
        // The y-intercept at x = 0, which is what the y = a * e^(b*x) contract
        // asks for. On an epoch-millisecond axis it underflows to 0; that is the
        // correctly rounded answer, and f() no longer multiplies by it.
        const lnA = this._meanlny - this._cachedGrowthRate * this._meanx;
        this._cachedCoefficient = Math.exp(lnA);

        // R^2 from the centred moments, so it does not inherit the cancellation
        // of the uncentred sums:
        //   ssTotal = sum((lnY - mean)^2) = _m2lny
        //   ssRes   = sum((lnY - lnA - b*x)^2) = _m2lny - b^2 * _m2x
        const ssTotal = this._m2lny;
        const ssRes =
            this._m2lny - this._cachedGrowthRate * this._cachedGrowthRate * this._m2x;

        this._cachedCorrelation = ssTotal === 0 ? 1 : Math.max(0, 1 - ssRes / ssTotal);
        this._cacheValid = true;
    }
}