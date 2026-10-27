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
        
        // Check for potential overflow before calculation
        if (Math.abs(this._cachedGrowthRate * x) > 500) return 0; // Safer limit to prevent overflow
        
        const result = this._cachedCoefficient * Math.exp(this._cachedGrowthRate * x);
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

        const denominator = this.count * this.sumx2 - this.sumx * this.sumx;
        if (Math.abs(denominator) < 1e-10) {
            this._cachedGrowthRate = 0;
            this._cachedCoefficient = 1;
            this._cachedCorrelation = 0;
            this._cacheValid = true;
            return;
        }

        this._cachedGrowthRate = (this.count * this.sumxlny - this.sumx * this.sumlny) / denominator;
        const lnA = (this.sumlny - this._cachedGrowthRate * this.sumx) / this.count;
        this._cachedCoefficient = Math.exp(lnA);

        // R^2 computed from running sums instead of a stored copy of every
        // point, which allocated one object per data point per fit:
        //   ssTotal = sum((lnY - mean)^2) = sumlnY2 - sumlny^2 / n
        //   ssRes   = sum((lnY - lnA - b*x)^2), expanded analytically
        const n = this.count;
        const b = this._cachedGrowthRate;
        const ssTotal = this.sumlny2 - (this.sumlny * this.sumlny) / n;
        const ssRes =
            this.sumlny2 -
            2 * lnA * this.sumlny -
            2 * b * this.sumxlny +
            n * lnA * lnA +
            2 * lnA * b * this.sumx +
            b * b * this.sumx2;

        this._cachedCorrelation = ssTotal === 0 ? 1 : Math.max(0, 1 - ssRes / ssTotal);
        this._cacheValid = true;
    }
}