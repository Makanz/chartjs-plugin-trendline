/**
 * A class that fits an exponential curve to a series of points using least squares.
 * Fits y = a * e^(b*x) by transforming to ln(y) = ln(a) + b*x
 */
export class ExponentialFitter {
    constructor() {
        this.count = 0;
        this.sumx = 0;
        this.sumlny = 0;
        this.sumx2 = 0;
        this.sumxlny = 0;
        this.minx = Number.MAX_VALUE;
        this.maxx = Number.MIN_VALUE;
        this.hasValidData = true;
        this.dataPoints = []; // Store data points for correlation calculation
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

        this.sumx += x;
        this.sumlny += lny;
        this.sumx2 += x * x;
        this.sumxlny += x * lny;
        if (x < this.minx) this.minx = x;
        if (x > this.maxx) this.maxx = x;
        this.dataPoints.push({x, y, lny}); // Store actual data points
        this.count++;
    }

    /**
     * Calculates the exponential growth rate (b in y = a * e^(b*x)).
     * @returns {number} - The exponential growth rate.
     */
    growthRate() {
        if (!this.hasValidData || this.count < 2) return 0;
        const denominator = this.count * this.sumx2 - this.sumx * this.sumx;
        if (Math.abs(denominator) < 1e-10) return 0;
        return (this.count * this.sumxlny - this.sumx * this.sumlny) / denominator;
    }

    /**
     * Calculates the exponential coefficient (a in y = a * e^(b*x)).
     * @returns {number} - The exponential coefficient.
     */
    coefficient() {
        if (!this.hasValidData || this.count < 2) return 1;
        const lnA = (this.sumlny - this.growthRate() * this.sumx) / this.count;
        return Math.exp(lnA);
    }

    /**
     * Returns the fitted exponential value (y) for a given x.
     * @param {number} x - The x-coordinate.
     * @returns {number} - The corresponding y-coordinate on the fitted exponential curve.
     */
    f(x) {
        if (!this.hasValidData || this.count < 2) return 0;
        const a = this.coefficient();
        const b = this.growthRate();
        
        // Check for potential overflow before calculation
        if (Math.abs(b * x) > 500) return 0; // Safer limit to prevent overflow
        
        const result = a * Math.exp(b * x);
        return isFinite(result) ? result : 0;
    }

    /**
     * Calculates the correlation coefficient (R-squared) for the exponential fit.
     * @returns {number} - The correlation coefficient (0-1).
     */
    correlation() {
        if (!this.hasValidData || this.count < 2) return 0;
        
        const meanLnY = this.sumlny / this.count;
        const lnA = Math.log(this.coefficient());
        const b = this.growthRate();
        
        let ssTotal = 0;
        let ssRes = 0;
        
        for (const point of this.dataPoints) {
            const predictedLnY = lnA + b * point.x;
            ssTotal += Math.pow(point.lny - meanLnY, 2);
            ssRes += Math.pow(point.lny - predictedLnY, 2);
        }
        
        if (ssTotal === 0) return 1;
        return Math.max(0, 1 - (ssRes / ssTotal));
    }

    /**
     * Returns the scale (growth rate) of the fitted exponential curve.
     * @returns {number} - The growth rate of the exponential curve.
     */
    scale() {
        return this.growthRate();
    }
}