import { BaseFitter } from './baseFitter.js';

/**
 * A class that fits a line to a series of points using least squares.
 */
export class LineFitter extends BaseFitter {
    constructor() {
        super();
        this.sumy = 0;
        this.sumxy = 0;
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

        const denominator = this.count * this.sumx2 - this.sumx * this.sumx;

        // Degenerate input: every x is identical (denominator exactly 0), or the
        // values are so large that the subtraction cancels out. Fall back to a
        // horizontal line through the mean y instead of returning NaN, which
        // made the trendline silently disappear.
        const magnitude = Math.abs(this.count * this.sumx2) + Math.abs(this.sumx * this.sumx);
        if (Math.abs(denominator) <= magnitude * 1e-12) {
            this._cachedSlope = 0;
            this._cachedIntercept = this.sumy / this.count;
            this._cacheValid = true;
            return;
        }

        this._cachedSlope = (this.count * this.sumxy - this.sumx * this.sumy) / denominator;
        this._cachedIntercept = (this.sumy - this._cachedSlope * this.sumx) / this.count;
        this._cacheValid = true;
    }
} 