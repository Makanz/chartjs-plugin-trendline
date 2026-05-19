/**
 * A base class for fitter classes that provides shared state and caching logic.
 * Handles count tracking, x-value accumulation, and min/max tracking.
 */
export class BaseFitter {
    constructor() {
        this.count = 0;
        this.sumx = 0;
        this.sumx2 = 0;
        this.minx = Number.MAX_VALUE;
        this.maxx = Number.MIN_VALUE;
        this._cacheValid = false;
    }

    /**
     * Adds a point to the fitter. Shared x-accumulation logic.
     * Subclasses should call super.add(x) and handle y-specific logic.
     * @param {number} x - The x-coordinate of the point.
     */
    add(x) {
        this.sumx += x;
        this.sumx2 += x * x;
        if (x < this.minx) this.minx = x;
        if (x > this.maxx) this.maxx = x;
        this.count++;
        this._cacheValid = false;
    }

    /**
     * Returns the scale (magnitude) of the fitted curve.
     * @returns {number} - The scale value.
     */
    scale() {
        return 0;
    }
}
