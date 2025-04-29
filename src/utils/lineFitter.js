/**
 * A class that fits a line to a series of points using least squares.
 */
export class LineFitter {
    constructor() {
        this.count = 0;
        this.sumx = 0;
        this.sumy = 0;
        this.sumx2 = 0;
        this.sumxy = 0;
        this.minx = Number.MAX_VALUE;
        this.maxx = Number.MIN_VALUE;
    }

    /**
     * Adds a point to the line fitter.
     * @param {number} x - The x-coordinate of the point.
     * @param {number} y - The y-coordinate of the point.
     */
    add(x, y) {
        this.sumx += x;
        this.sumy += y;
        this.sumx2 += x * x;
        this.sumxy += x * y;
        if (x < this.minx) this.minx = x;
        if (x > this.maxx) this.maxx = x;
        this.count++;
    }

    /**
     * Calculates the slope of the fitted line.
     * @returns {number} - The slope of the line.
     */
    slope() {
        const denominator = this.count * this.sumx2 - this.sumx * this.sumx;
        return (this.count * this.sumxy - this.sumx * this.sumy) / denominator;
    }

    /**
     * Calculates the y-intercept of the fitted line.
     * @returns {number} - The y-intercept of the line.
     */
    intercept() {
        return (this.sumy - this.slope() * this.sumx) / this.count;
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
} 