/**
 * Base class for trendline fitters with common functionality.
 */
class BaseFitter {
    constructor() {
        this.count = 0;
        this.minx = Number.MAX_VALUE;
        this.maxx = Number.MIN_VALUE;
    }

    /**
     * Adds a point to the fitter.
     * @param {number} x - The x-coordinate of the point.
     * @param {number} y - The y-coordinate of the point.
     */
    add(x, y) {
        if (x < this.minx) this.minx = x;
        if (x > this.maxx) this.maxx = x;
        this.count++;
    }

    /**
     * Returns the fitted value (y) for a given x.
     * @param {number} x - The x-coordinate.
     * @returns {number} - The corresponding y-coordinate on the fitted line.
     */
    f(x) {
        throw new Error('Not implemented');
    }

    /**
     * Calculates the projection of the line for the future value.
     * @returns {number} - The future value based on the fitted line.
     */
    fo() {
        throw new Error('Not implemented');
    }

    /**
     * Returns the scale (variance) of the fitted line.
     * @returns {number} - The scale of the fitted line.
     */
    scale() {
        throw new Error('Not implemented');
    }
}

/**
 * A class that fits a line to a series of points using least squares.
 */
export class LineFitter extends BaseFitter {
    constructor() {
        super();
        this.sumx = 0;
        this.sumy = 0;
        this.sumx2 = 0;
        this.sumxy = 0;
    }

    add(x, y) {
        super.add(x, y);
        this.sumx += x;
        this.sumy += y;
        this.sumx2 += x * x;
        this.sumxy += x * y;
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

/**
 * A class that fits an exponential curve (y = ae^bx) to points using least squares.
 * Uses log-linear transformation: ln(y) = ln(a) + bx
 */
export class ExponentialFitter extends BaseFitter {
    constructor() {
        super();
        this.sumx = 0;
        this.sumlnY = 0;
        this.sumx2 = 0;
        this.sumxlnY = 0;
    }

    add(x, y) {
        if (y <= 0)
            throw new Error('Exponential fit requires positive y values');
        super.add(x, y);
        this.sumx += x;
        const lnY = Math.log(y);
        this.sumlnY += lnY;
        this.sumx2 += x * x;
        this.sumxlnY += x * lnY;
    }

    /**
     * Gets the coefficients [a, b] for y = ae^bx
     */
    coefficients() {
        const denominator = this.count * this.sumx2 - this.sumx * this.sumx;
        const b =
            (this.count * this.sumxlnY - this.sumx * this.sumlnY) / denominator;
        const lnA = (this.sumlnY - b * this.sumx) / this.count;
        return [Math.exp(lnA), b];
    }

    f(x) {
        const [a, b] = this.coefficients();
        return a * Math.exp(b * x);
    }

    fo() {
        throw new Error('Exponential projection not implemented');
    }

    scale() {
        const [_, b] = this.coefficients();
        return b;
    }
}

/**
 * A class that fits a logarithmic curve (y = a + b*ln(x)) to points using least squares.
 */
export class LogarithmicFitter extends BaseFitter {
    constructor() {
        super();
        this.sumlnX = 0;
        this.sumy = 0;
        this.sumlnX2 = 0;
        this.sumylnX = 0;
    }

    add(x, y) {
        if (x <= 0)
            throw new Error('Logarithmic fit requires positive x values');
        super.add(x, y);
        const lnX = Math.log(x);
        this.sumlnX += lnX;
        this.sumy += y;
        this.sumlnX2 += lnX * lnX;
        this.sumylnX += y * lnX;
    }

    /**
     * Gets the coefficients [a, b] for y = a + b*ln(x)
     */
    coefficients() {
        const denominator =
            this.count * this.sumlnX2 - this.sumlnX * this.sumlnX;
        const b =
            (this.count * this.sumylnX - this.sumlnX * this.sumy) / denominator;
        const a = (this.sumy - b * this.sumlnX) / this.count;
        return [a, b];
    }

    f(x) {
        const [a, b] = this.coefficients();
        return a + b * Math.log(x);
    }

    fo() {
        throw new Error('Logarithmic projection not implemented');
    }

    scale() {
        const [_, b] = this.coefficients();
        return b;
    }
}
