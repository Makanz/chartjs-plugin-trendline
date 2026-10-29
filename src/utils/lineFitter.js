import { BaseFitter } from './baseFitter.js';

/**
 * A class that fits a line to a series of points using least squares.
 */
export class LineFitter extends BaseFitter {
    constructor() {
        super();
        this.sumy = 0;
        this.sumxy = 0;

        // Running (Welford) moments about the mean. These are what the
        // coefficients are computed from: the textbook sums above lose all
        // significance when x is large (epoch milliseconds) while the spread is
        // small, because `count * sumx2 - sumx * sumx` subtracts two nearly equal
        // ~1e30 numbers to get a ~1e10 result.
        this._meanx = 0;
        this._meany = 0;
        this._m2x = 0;
        this._cxy = 0;

        this._cachedSlope = null;
        this._cachedIntercept = null;
    }

    /**
     * Adds a point to the line fitter.
     * @param {number} x - The x-coordinate of the point.
     * @param {number} y - The y-coordinate of the point.
     */
    add(x, y) {
        super.add(x);
        this.sumy += y;
        this.sumxy += x * y;

        const count = this.count;
        const deltaX = x - this._meanx;
        this._meanx += deltaX / count;
        const deltaY = y - this._meany;
        this._meany += deltaY / count;
        this._m2x += deltaX * (x - this._meanx);
        this._cxy += deltaX * (y - this._meany);
    }

    /**
     * Calculates the slope of the fitted line.
     * @returns {number} - The slope of the line.
     */
    slope() {
        if (!this._cacheValid) {
            this._computeCoefficients();
        }
        return this._cachedSlope;
    }

    /**
     * Calculates the y-intercept of the fitted line.
     * @returns {number} - The y-intercept of the line.
     */
    intercept() {
        if (!this._cacheValid) {
            this._computeCoefficients();
        }
        return this._cachedIntercept;
    }

    /**
     * Returns the fitted value (y) for a given x.
     * @param {number} x - The x-coordinate.
     * @returns {number} - The corresponding y-coordinate on the fitted line.
     */
    f(x) {
        return this.slope() * x + this.intercept();
    }

    /**
     * Calculates the projection of the line for the future value.
     * @returns {number} - The future value based on the fitted line.
     */
    fo() {
        const slope = this.slope();
        // A horizontal line (or an undefined one) never crosses the x axis.
        if (!isFinite(slope) || slope === 0) return NaN;
        return -this.intercept() / slope;
    }

    /**
     * Returns the scale (variance) of the fitted line.
     * @returns {number} - The scale of the fitted line.
     */
    scale() {
        return this.slope();
    }

    _computeCoefficients() {
        // Fewer than two points has no line at all. Keep returning NaN here so
        // callers can detect "not enough data" (addFitter checks count first).
        if (this.count < 2) {
            this._cachedSlope = NaN;
            this._cachedIntercept = NaN;
            this._cacheValid = true;
            return;
        }

        // Degenerate input: every x is identical, so there is no x spread to
        // regress on. Fall back to a horizontal line through the mean y instead
        // of returning NaN, which made the trendline silently disappear.
        //
        // The test is on the centred sum of squares (`_m2x`), not on a tolerance
        // against the magnitude of `count * sumx2`: only an actually constant x
        // is degenerate. A spread that merely looks small next to the epochs it
        // is measured in is a real trend, and must keep its slope.
        if (!(this._m2x > 0)) {
            this._cachedSlope = 0;
            this._cachedIntercept = this._meany;
            this._cacheValid = true;
            return;
        }

        this._cachedSlope = this._cxy / this._m2x;
        this._cachedIntercept = this._meany - this._cachedSlope * this._meanx;
        this._cacheValid = true;
    }
} 