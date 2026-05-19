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
        return -this.intercept() / this.slope();
    }

    /**
     * Returns the scale (variance) of the fitted line.
     * @returns {number} - The scale of the fitted line.
     */
    scale() {
        return this.slope();
    }

    _computeCoefficients() {
        const denominator = this.count * this.sumx2 - this.sumx * this.sumx;
        this._cachedSlope = (this.count * this.sumxy - this.sumx * this.sumy) / denominator;
        this._cachedIntercept = (this.sumy - this._cachedSlope * this.sumx) / this.count;
        this._cacheValid = true;
    }
} 