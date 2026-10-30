/*!
 * chartjs-plugin-trendline v3.3.0
 * https://github.com/Makanz/chartjs-plugin-trendline
 * (c) 2026 Marcus Alsterfjord
 * Released under the MIT license
 */
/**
 * A base class for fitter classes that provides shared state and caching logic.
 * Handles count tracking, x-value accumulation, and min/max tracking.
 */
class BaseFitter {
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

/**
 * A class that fits a line to a series of points using least squares.
 */
class LineFitter extends BaseFitter {
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

/**
 * A class that fits an exponential curve to a series of points using least squares.
 * Fits y = a * e^(b*x) by transforming to ln(y) = ln(a) + b*x
 */
class ExponentialFitter extends BaseFitter {
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

/**
 * Retrieves the x and y scales from the chart instance.
 * @param {Chart} chartInstance - The chart instance.
 * @returns {Object} - The xScale and yScale of the chart.
 */
const getScales = (chartInstance) => {
    let xScale, yScale;
    for (const scale of Object.values(chartInstance.scales)) {
        if (scale.isHorizontal()) xScale = scale;
        else yScale = scale;
        if (xScale && yScale) break;
    }
    return { xScale, yScale };
};

/**
 * Sets the line style (dashed, dotted, solid) for the canvas context.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {string} lineStyle - The style of the line ('dotted', 'dashed', 'solid', etc.).
 */
const setLineStyle = (ctx, lineStyle) => {
    switch (lineStyle) {
        case 'dotted':
            ctx.setLineDash([2, 2]);
            break;
        case 'dashed':
            ctx.setLineDash([8, 3]);
            break;
        case 'dashdot':
            ctx.setLineDash([8, 3, 2, 3]);
            break;
        case 'solid':
        default:
            ctx.setLineDash([]);
            break;
    }
};

/**
 * Validates that all provided named coordinate values are finite numbers.
 * @param {Object<string, number>} coords - Named coordinate values to validate.
 * @param {string} label - Label for the warning message (e.g., 'draw trendline').
 * @returns {boolean} - True if all values are finite, false otherwise.
 */
const validateFiniteCoords = (coords, label) => {
    for (const value of Object.values(coords)) {
        if (!isFinite(value)) {
            console.warn(
                `Cannot ${label}: coordinates contain non-finite values`,
                coords
            );
            return false;
        }
    }
    return true;
};

/**
 * Draws the trendline on the canvas context.
 * @param {Object} params - The trendline parameters.
 * @param {CanvasRenderingContext2D} params.ctx - The canvas rendering context.
 * @param {number} params.x1 - Starting x-coordinate of the trendline.
 * @param {number} params.y1 - Starting y-coordinate of the trendline.
 * @param {number} params.x2 - Ending x-coordinate of the trendline.
 * @param {number} params.y2 - Ending y-coordinate of the trendline.
 * @param {string} params.colorMin - The starting color of the trendline gradient.
 * @param {string} params.colorMax - The ending color of the trendline gradient.
 */
const drawTrendline = ({ ctx, x1, y1, x2, y2, colorMin, colorMax }) => {
    if (!validateFiniteCoords({ x1, y1, x2, y2 }, 'draw trendline')) return;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.strokeStyle = resolveStrokeStyle({
        ctx,
        fromX: x1, fromY: y1,
        toX: x2, toY: y2,
        colorMin,
        colorMax,
    });

    ctx.stroke();
    ctx.closePath();
};

/**
 * Draws a trendline made of one or more polylines — the shape an exponential
 * fit needs, since it is a curve rather than a straight segment. Each polyline
 * is a separate visible stretch; the gaps between them are parts of the curve
 * that fall outside the chart area.
 * @param {Object} params - The trendline parameters.
 * @param {CanvasRenderingContext2D} params.ctx - The canvas rendering context.
 * @param {Array<Array<{x: number, y: number}>>} params.polylines - Pixel-space polylines, in draw order.
 * @param {string} params.colorMin - The starting colour of the trendline gradient.
 * @param {string} params.colorMax - The ending colour of the trendline gradient.
 */
const drawTrendlinePath = ({ ctx, polylines, colorMin, colorMax }) => {
    if (!hasDrawablePolylines(polylines, 'draw trendline')) return;

    ctx.beginPath();
    polylines.forEach((polyline) => {
        ctx.moveTo(polyline[0].x, polyline[0].y);
        for (let index = 1; index < polyline.length; index++) {
            ctx.lineTo(polyline[index].x, polyline[index].y);
        }
    });

    const first = polylines[0][0];
    const lastPolyline = polylines[polylines.length - 1];
    const last = lastPolyline[lastPolyline.length - 1];

    ctx.strokeStyle = resolveStrokeStyle({
        ctx,
        fromX: first.x, fromY: first.y,
        toX: last.x, toY: last.y,
        colorMin,
        colorMax,
    });
    ctx.stroke();
    ctx.closePath();
};

/**
 * Fills the area between a trendline path and the bottom of the chart.
 * @param {Object} params - The fill parameters.
 * @param {CanvasRenderingContext2D} params.ctx - The canvas rendering context.
 * @param {Array<Array<{x: number, y: number}>>} params.polylines - Pixel-space polylines, in draw order.
 * @param {number} params.drawBottom - The bottom boundary of the chart.
 * @param {string} params.fillColor - The fill colour.
 */
const fillBelowTrendlinePath = ({ ctx, polylines, drawBottom, fillColor }) => {
    if (!hasDrawablePolylines(polylines, 'fill below trendline')) return;
    if (!validateFiniteCoords({ drawBottom }, 'fill below trendline')) return;

    ctx.fillStyle = fillColor;

    polylines.forEach((polyline) => {
        const first = polyline[0];
        const last = polyline[polyline.length - 1];

        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        for (let index = 1; index < polyline.length; index++) {
            ctx.lineTo(polyline[index].x, polyline[index].y);
        }
        ctx.lineTo(last.x, drawBottom);
        ctx.lineTo(first.x, drawBottom);
        ctx.closePath();
        ctx.fill();
    });
};

/**
 * Checks that a polyline collection can be drawn: at least one line, each with
 * two or more finite points. Warns once and returns false otherwise.
 * @param {Array<Array<{x: number, y: number}>>} polylines - Pixel-space polylines.
 * @param {string} label - Label for the warning message (e.g., 'draw trendline').
 * @returns {boolean} - True if every polyline is drawable.
 */
const hasDrawablePolylines = (polylines, label) => {
    if (Array.isArray(polylines) && polylines.length > 0) {
        const drawable = polylines.every(
            (polyline) =>
                Array.isArray(polyline) &&
                polyline.length >= 2 &&
                polyline.every((point) => point && isFinite(point.x) && isFinite(point.y))
        );
        if (drawable) return true;
    }

    console.warn(`Cannot ${label}: coordinates contain non-finite values`, polylines);
    return false;
};

/**
 * Resolves the stroke style for a path: a plain colour, or a gradient from the
 * first to the last point when the two colours differ.
 * @param {Object} params - The style parameters.
 * @param {CanvasRenderingContext2D} params.ctx - The canvas rendering context.
 * @param {number} params.fromX - Start of the gradient, x pixel.
 * @param {number} params.fromY - Start of the gradient, y pixel.
 * @param {number} params.toX - End of the gradient, x pixel.
 * @param {number} params.toY - End of the gradient, y pixel.
 * @param {string} params.colorMin - The colour at the start of the gradient.
 * @param {string} params.colorMax - The colour at the end of the gradient.
 * @returns {string|CanvasGradient} - The resolved stroke style.
 */
const resolveStrokeStyle = ({ ctx, fromX, fromY, toX, toY, colorMin, colorMax }) => {
    // Identical colours are the common case (only one colour configured, the
    // other falls back to the same default). A gradient then costs a
    // createLinearGradient + two addColorStop calls per dataset per frame for
    // a solid line.
    if (colorMin === colorMax) return colorMin;

    // Additional validation for degenerate gradients
    const dx = toX - fromX;
    const dy = toY - fromY;
    const gradientLength = Math.sqrt(dx * dx + dy * dy);

    // If the gradient vector is too small, createLinearGradient may fail
    if (gradientLength < 0.01) {
        console.warn('Gradient vector too small, using solid color:', {
            x1: fromX,
            y1: fromY,
            x2: toX,
            y2: toY,
            length: gradientLength,
        });
        return colorMin;
    }

    try {
        const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
        gradient.addColorStop(0, colorMin);
        gradient.addColorStop(1, colorMax);
        return gradient;
    } catch (e) {
        // Fallback to solid color if gradient creation fails
        console.warn('Gradient creation failed, using solid color:', e);
        return colorMin;
    }
};

/**
 * Fills the area below the trendline with the specified color.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} x1 - Starting x-coordinate of the trendline.
 * @param {number} y1 - Starting y-coordinate of the trendline.
 * @param {number} x2 - Ending x-coordinate of the trendline.
 * @param {number} y2 - Ending y-coordinate of the trendline.
 * @param {number} drawBottom - The bottom boundary of the chart.
 * @param {string} fillColor - The color to fill below the trendline.
 */
const fillBelowTrendline = (ctx, x1, y1, x2, y2, drawBottom, fillColor) => {
    if (!validateFiniteCoords({ x1, y1, x2, y2, drawBottom }, 'fill below trendline')) return;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2, drawBottom);
    ctx.lineTo(x1, drawBottom);
    ctx.lineTo(x1, y1);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();
};

/**
 * Adds a label to the trendline at the calculated angle.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Object} options - Configuration options for the label.
 * @param {string} options.label - The label text to add.
 * @param {number} [options.x] - The x-coordinate to place the label at. Defaults to the midpoint of x1..x2.
 * @param {number} [options.y] - The y-coordinate to place the label at. Defaults to the midpoint of y1..y2.
 * @param {number} [options.x1] - The starting x-coordinate of the trendline.
 * @param {number} [options.y1] - The starting y-coordinate of the trendline.
 * @param {number} [options.x2] - The ending x-coordinate of the trendline.
 * @param {number} [options.y2] - The ending y-coordinate of the trendline.
 * @param {number} options.angle - The angle (in radians) of the trendline.
 * @param {string} options.labelColor - The color of the label text.
 * @param {string} options.family - The font family for the label text.
 * @param {number} options.size - The font size for the label text.
 * @param {number} options.offset - The offset of the label from the trendline.
 */
const addTrendlineLabel = (ctx, options) => {
    const {
        label,
        x,
        y,
        x1, y1, x2, y2,
        angle,
        labelColor,
        family,
        size,
        offset,
    } = options;
    // Set the label font and color
    ctx.font = `${size}px ${family}`;
    ctx.fillStyle = labelColor;

    // Label width
    const labelWidth = ctx.measureText(label).width;

    // The caller may hand over a point on the line (a curve has no midpoint
    // between two endpoints); otherwise centre the label on it.
    const labelX = x ?? (x1 + x2) / 2;
    const labelY = y ?? (y1 + y2) / 2;

    // Save the current state of the canvas
    ctx.save();

    // Translate to the label position
    ctx.translate(labelX, labelY);

    // Rotate the context to align with the trendline
    ctx.rotate(angle);

    // Adjust for the length of the label and rotation
    const adjustedX = -labelWidth / 2; // Center the label horizontally
    const adjustedY = offset; // Adjust Y to compensate for the height

    // Draw the label
    ctx.fillText(label, adjustedX, adjustedY);

    // Restore the canvas state
    ctx.restore();
};

/**
 * Number of straight segments used to sample an exponential trendline. The
 * curve is smooth at this resolution on any realistic chart, and 64 segments
 * cost a fraction of the one regression fit the plugin already caches.
 */
const EXPONENTIAL_CURVE_SEGMENTS = 64;

/**
 * Collects valid data points from a dataset and adds them to the fitter.
 * Handles null/undefined values, trendoffset logic, time scales, and different
 * data structures (object {x,y} vs array of numbers).
 * @param {Object} fitter - The fitter instance (LineFitter or ExponentialFitter).
 * @param {Object} dataset - The dataset configuration from the chart.
 * @param {number} trendoffset - Number of data points to skip (positive from start, negative from end).
 * @param {number} effectiveFirstIndex - The index of the first valid data point.
 * @param {boolean} xy - Whether the data is structured as objects {x,y}.
 * @param {Scale} xScale - The x-axis scale object.
 * @param {string} xAxisKey - Key for x-values in object data.
 * @param {string} yAxisKey - Key for y-values in object data.
 * @param {Array} chartLabels - Labels array from chart (for time scales with array data).
 */
const collectDataPoints = (fitter, dataset, trendoffset, effectiveFirstIndex, xy, xScale, xAxisKey, yAxisKey, chartLabels) => {
    // Hoisted: this runs once per point, so building the array lookup inside
    // the loop allocated one throwaway array per data point.
    const scaleType = xScale?.options?.type ?? xScale?.type;
    const isTimeScale = scaleType === 'time' || scaleType === 'timeseries';

    dataset.data.forEach((data, index) => {
        // Skip any data point that is null or undefined directly. This is a general guard.
        if (data == null) return; 
        
        // Apply trendoffset logic for including/excluding points:
        // 1. Positive offset: Skip data points if their index is before the `effectiveFirstIndex`.
        //    `effectiveFirstIndex` already accounts for the offset and initial nulls.
        if (trendoffset > 0 && index < effectiveFirstIndex) return;
        // 2. Negative offset: Skip data points if their index is at or after the calculated end point.
        //    `dataset.data.length + trendoffset` marks the first index of the points to be excluded from the end.
        //    For example, if length is 10 and offset is -2, points from index 8 onwards are skipped.
        if (trendoffset < 0 && index >= dataset.data.length + trendoffset) return;

        // Process data based on scale type and data structure.
        if (isTimeScale && xy) {
            // For time-based scales with object data, convert x to a numerical timestamp; ensure y is a valid number.
            let x = data[xAxisKey] != null ? data[xAxisKey] : data.t; // `data.t` is a Chart.js internal fallback for time data.
            const yValue = data[yAxisKey];

            // Both x and y must be valid for the point to be included.
            if (x != null && yValue != null && !isNaN(yValue)) {
                // A numeric x is already a timestamp - skip the Date allocation.
                fitter.add(typeof x === 'number' ? x : new Date(x).getTime(), yValue);
            }
            // If x or yValue is invalid, the point is skipped.
        } else if (xy) { // Data is identified as array of objects {x,y}.
            const xVal = data[xAxisKey];
            const yVal = data[yAxisKey];

            const xIsValid = xVal != null && !isNaN(xVal);
            const yIsValid = yVal != null && !isNaN(yVal);

            // Both xVal and yVal must be valid numbers to include the point.
            if (xIsValid && yIsValid) {
                fitter.add(xVal, yVal);
            }
            // If either xVal or yVal is invalid, the point is skipped. No fallback to using index.
        } else if (isTimeScale && !xy) {
            // For time-based scales with array of numbers, get the x-value from the chart labels
            if (chartLabels && chartLabels[index] && data != null && !isNaN(data)) {
                const label = chartLabels[index];
                const timeValue = typeof label === 'number' ? label : new Date(label).getTime();
                if (!isNaN(timeValue)) {
                    fitter.add(timeValue, data);
                }
            }
        } else { 
            // Data is an array of numbers (or other non-object types).
            // The 'data' variable itself is the y-value, and 'index' is the x-value.
            // We still need to check for null/NaN here because 'data' (the y-value) could be null/NaN
            // even if the entry 'data' (the point/container) wasn't null in the initial check.
            // This applies if dataset.data = [1, 2, null, 4].
            if (data != null && !isNaN(data)) {
                 fitter.add(index, data);
            }
        }
    });
};

/**
 * Calculates the pixel coordinates of a linear trendline, handling both
 * projection and non-projection modes. Projection mode extends the trendline
 * across the full chart area, while non-projection mode fits the line exactly
 * to the data range.
 *
 * Exponential fits do not use this function: a curve cannot be represented by
 * two endpoints. They sample the fit through sampleExponentialPath instead.
 * @param {Object} fitter - The LineFitter instance.
 * @param {Object} trendlineConfig - The trendline configuration object.
 * @param {Scale} xScale - The x-axis scale object.
 * @param {Scale} yScaleToUse - The y-axis scale object to use.
 * @param {Object} chartArea - The chart area with { left, right, top, bottom } pixel boundaries.
 * @returns {Object} An object with { x1_px, y1_px, x2_px, y2_px } pixel coordinates.
 */
const calculateProjectedCoordinates = (fitter, trendlineConfig, xScale, yScaleToUse, chartArea) => {
    let x1_px, y1_px, x2_px, y2_px;

    // Determine trendline start/end points based on the 'projection' option.
    if (trendlineConfig.projection) {
        const points = [];

        const slope = fitter.slope();
        const intercept = fitter.intercept();

        // Use a relative threshold for near-zero slope detection.
        // With time-scale axes, x-values are large timestamps (~1.7e12 ms),
        // so even visually significant slopes have absolute values well below
        // 1e-6. Compare slope * x-range against the y-range instead.
        const xRange = fitter.maxx - fitter.minx;
        const yRange = (yScaleToUse.max - yScaleToUse.min) || 1;
        const isNearZeroSlope = Math.abs(slope * xRange) < Math.abs(yRange) * 1e-6;

        if (!isNearZeroSlope) {
            const val_y_top = yScaleToUse.getValueForPixel(chartArea.top);
            const x_at_top = (val_y_top - intercept) / slope;
            points.push({ x: x_at_top, y: val_y_top });

            const val_y_bottom = yScaleToUse.getValueForPixel(chartArea.bottom);
            const x_at_bottom = (val_y_bottom - intercept) / slope;
            points.push({ x: x_at_bottom, y: val_y_bottom });
        } else {
            points.push({ x: xScale.getValueForPixel(chartArea.left), y: intercept });
            points.push({ x: xScale.getValueForPixel(chartArea.right), y: intercept });
        }

        const val_x_left = xScale.getValueForPixel(chartArea.left);
        const y_at_left = fitter.f(val_x_left);
        points.push({ x: val_x_left, y: y_at_left });

        const val_x_right = xScale.getValueForPixel(chartArea.right);
        const y_at_right = fitter.f(val_x_right);
        points.push({ x: val_x_right, y: y_at_right });

        const chartMinX = xScale.getValueForPixel(chartArea.left);
        const chartMaxX = xScale.getValueForPixel(chartArea.right);

        const yValsFromPixels = [yScaleToUse.getValueForPixel(chartArea.top), yScaleToUse.getValueForPixel(chartArea.bottom)];
        const finiteYVals = yValsFromPixels.filter(y => isFinite(y));
        const actualChartMinY = finiteYVals.length > 0 ? Math.min(...finiteYVals) : -Infinity;
        const actualChartMaxY = finiteYVals.length > 0 ? Math.max(...finiteYVals) : Infinity;

        let validPoints = points.filter(p =>
            isFinite(p.x) && isFinite(p.y) &&
            p.x >= chartMinX && p.x <= chartMaxX && p.y >= actualChartMinY && p.y <= actualChartMaxY
        );

        validPoints = validPoints.filter((point, index, self) =>
            index === self.findIndex((t) => (
                Math.abs(t.x - point.x) < 1e-4 && Math.abs(t.y - point.y) < 1e-4
            ))
        );

        if (validPoints.length >= 2) {
            validPoints.sort((a, b) => a.x - b.x || a.y - b.y);

            x1_px = xScale.getPixelForValue(validPoints[0].x);
            y1_px = yScaleToUse.getPixelForValue(validPoints[0].y);
            x2_px = xScale.getPixelForValue(validPoints[validPoints.length - 1].x);
            y2_px = yScaleToUse.getPixelForValue(validPoints[validPoints.length - 1].y);
        } else {
            x1_px = NaN; y1_px = NaN; x2_px = NaN; y2_px = NaN;
        }

    } else {
        const y_at_minx = fitter.f(fitter.minx);
        const y_at_maxx = fitter.f(fitter.maxx);

        x1_px = xScale.getPixelForValue(fitter.minx);
        y1_px = yScaleToUse.getPixelForValue(y_at_minx);
        x2_px = xScale.getPixelForValue(fitter.maxx);
        y2_px = yScaleToUse.getPixelForValue(y_at_maxx);
    }

    return { x1_px, y1_px, x2_px, y2_px };
};

/**
 * Samples an exponential fit as pixel-space points. A linear fit is exact
 * between its endpoints; this one is a curve, and drawing it as a chord across
 * the data range is wrong on any axis where an exponential is not a straight
 * line (that is, every axis except a logarithmic one).
 * @param {Object} fitter - The ExponentialFitter instance.
 * @param {Object} trendlineConfig - The trendline configuration object.
 * @param {Scale} xScale - The x-axis scale object.
 * @param {Scale} yScale - The y-axis scale object to use.
 * @param {Object} chartArea - The chart area with { left, right, top, bottom } pixel boundaries.
 * @returns {Array<{x: number, y: number}|null>} Pixel points; a null marks a
 *   break where the fit or the scale cannot place a value.
 */
const sampleExponentialPath = (fitter, trendlineConfig, xScale, yScale, chartArea) => {
    let startX;
    let endX;

    if (trendlineConfig.projection) {
        startX = xScale.getValueForPixel(chartArea.left);
        endX = xScale.getValueForPixel(chartArea.right);
    } else {
        startX = fitter.minx;
        endX = fitter.maxx;
    }

    if (!isFinite(startX) || !isFinite(endX) || startX === endX) return [];

    const points = [];
    for (let index = 0; index <= EXPONENTIAL_CURVE_SEGMENTS; index++) {
        const x = startX + ((endX - startX) * index) / EXPONENTIAL_CURVE_SEGMENTS;
        const pixelX = xScale.getPixelForValue(x);
        const pixelY = yScale.getPixelForValue(fitter.f(x));

        // A null marks a break. The fit overflows to 0 outside its guard, and a
        // logarithmic axis has no pixel for a value at or below zero — bridging
        // across either would draw a segment the data does not support.
        points.push(isFinite(pixelX) && isFinite(pixelY) ? { x: pixelX, y: pixelY } : null);
    }
    return points;
};

/**
 * Clips a sampled path to the chart area, returning the visible stretches as
 * polylines. Breaks (null entries) and segments entirely outside the area end
 * the current stretch, so the caller never draws across a gap.
 * @param {Array<{x: number, y: number}|null>} points - Pixel-space points.
 * @param {Object} chartArea - The chart area with { left, right, top, bottom } pixel boundaries.
 * @returns {Array<Array<{x: number, y: number}>>} Visible polylines.
 */
const clipPolylineToArea = (points, chartArea) => {
    const polylines = [];
    let current = [];

    const closeCurrent = () => {
        if (current.length >= 2) polylines.push(current);
        current = [];
    };

    const isUsable = (point) => point && isFinite(point.x) && isFinite(point.y);

    for (let index = 0; index < points.length; index++) {
        const point = points[index];

        if (!isUsable(point)) {
            closeCurrent();
            continue;
        }

        const previous = points[index - 1];
        if (!isUsable(previous)) {
            closeCurrent();
            current.push({ x: point.x, y: point.y });
            continue;
        }

        const clipped = liangBarskyClip(previous.x, previous.y, point.x, point.y, chartArea);
        if (!clipped) {
            closeCurrent();
            continue;
        }

        const last = current[current.length - 1];
        if (!last || Math.abs(last.x - clipped.x1) > 1e-6 || Math.abs(last.y - clipped.y1) > 1e-6) {
            // The segment enters the area somewhere other than where the
            // previous one left off: start a new visible stretch.
            closeCurrent();
            current.push({ x: clipped.x1, y: clipped.y1 });
        }

        current.push({ x: clipped.x2, y: clipped.y2 });
    }

    closeCurrent();
    return polylines;
};

/**
 * Picks the label position and angle on a drawn curve: the middle of the
 * longest visible stretch, rotated along the tangent there.
 * @param {Array<Array<{x: number, y: number}>>} polylines - Visible polylines.
 * @returns {{x: number, y: number, angle: number}} Anchor point and angle.
 */
const curveLabelAnchor = (polylines) => {
    const longest = polylines.reduce((best, line) => (line.length > best.length ? line : best));
    const middle = Math.floor(longest.length / 2);
    const before = longest[Math.max(0, middle - 1)];
    const after = longest[Math.min(longest.length - 1, middle + 1)];
    const anchor = longest[middle];

    return {
        x: anchor.x,
        y: anchor.y,
        angle: Math.atan2(after.y - before.y, after.x - before.x),
    };
};

/**
 * Locates the first usable data point so the fit can decide between {x,y}
 * objects and plain number arrays, and honour a positive trendoffset.
 * @param {Object} dataset - The chart dataset.
 * @param {number} trendoffset - Sanitized trend offset.
 * @returns {number} Index of the first considered data point (or data.length).
 */
const findEffectiveFirstIndex = (dataset, trendoffset) => {
    const start = trendoffset > 0 ? trendoffset : 0;
    const data = dataset.data;

    // Plain loop instead of data.slice(start).findIndex(...): the slice copied
    // the whole array on every fit.
    for (let index = start; index < data.length; index++) {
        const point = data[index];
        if (point !== undefined && point !== null) return index;
    }
    return data.length;
};

/**
 * Fits the regression for a dataset. This is the expensive part (O(points)),
 * so callers may cache the result per chart update - see fitCache in addFitter.
 * @param {Object} dataset - The chart dataset.
 * @param {Object} options - Fit inputs.
 * @returns {Object} A LineFitter or ExponentialFitter instance.
 */
const buildFitter = (dataset, options) => {
    const { isExponential, xScale, xAxisKey, yAxisKey, chartLabels } = options;
    let trendoffset = options.trendoffset || 0;

    // Sanitize trendoffset: if its absolute value is too large, reset to 0.
    // This prevents errors if offset is out of bounds of the dataset length.
    if (Math.abs(trendoffset) >= dataset.data.length) trendoffset = 0;

    const effectiveFirstIndex = findEffectiveFirstIndex(dataset, trendoffset);

    // Determine data structure type (object {x,y} or array of numbers) based on the first valid data point.
    // This informs how `xAxisKey` and `yAxisKey` are used or if `index` is used for x-values.
    const xy = effectiveFirstIndex < dataset.data.length && typeof dataset.data[effectiveFirstIndex] === 'object';

    const fitter = isExponential ? new ExponentialFitter() : new LineFitter();
    collectDataPoints(fitter, dataset, trendoffset, effectiveFirstIndex, xy, xScale, xAxisKey, yAxisKey, chartLabels);
    return fitter;
};

/**
 * Returns the cached fit entry for the dataset, or builds and stores one.
 * @param {Map} fitCache - Per chart update cache (dataset -> entry).
 * @param {Object} dataset - The chart dataset.
 * @param {Object} options - Fit inputs.
 * @returns {Object} The cache entry, holding the fitter and the drawn curve.
 */
const getCachedFit = (fitCache, dataset, options) => {
    const scaleType = options.xScale?.options?.type ?? options.xScale?.type;
    const signature = [
        options.isExponential ? 'exp' : 'lin',
        options.xAxisKey,
        options.yAxisKey,
        options.trendoffset || 0,
        scaleType,
    ].join('|');

    const cached = fitCache.get(dataset);
    if (
        cached &&
        cached.signature === signature &&
        cached.data === dataset.data &&
        cached.length === dataset.data.length
    ) {
        return cached;
    }

    const entry = {
        signature,
        data: dataset.data,
        length: dataset.data.length,
        fitter: buildFitter(dataset, options),
        curve: null,
    };
    fitCache.set(dataset, entry);
    return entry;
};

/**
 * Returns the sampled, clipped curve for the current update, or builds and
 * stores it. Sampling 64 points is cheap, but the draw hook runs once per
 * animation frame, and the chart area and scale bounds do not change between
 * frames of the same update.
 * @param {Object} entry - The fit cache entry.
 * @param {Object} inputs - { trendlineConfig, xScale, yScale, chartArea }.
 * @param {Function} build - Builds the polylines when the cache misses.
 * @returns {Array<Array<{x: number, y: number}>>} Visible polylines.
 */
const getCachedCurve = (entry, inputs, build) => {
    const { trendlineConfig, xScale, yScale, chartArea } = inputs;
    const curve = entry.curve;

    const isSameCurve =
        curve &&
        curve.projection === !!trendlineConfig.projection &&
        curve.left === chartArea.left &&
        curve.right === chartArea.right &&
        curve.top === chartArea.top &&
        curve.bottom === chartArea.bottom &&
        curve.xMin === xScale.min &&
        curve.xMax === xScale.max &&
        curve.yMin === yScale.min &&
        curve.yMax === yScale.max;

    if (isSameCurve) return curve.polylines;

    entry.curve = {
        projection: !!trendlineConfig.projection,
        left: chartArea.left,
        right: chartArea.right,
        top: chartArea.top,
        bottom: chartArea.bottom,
        xMin: xScale.min,
        xMax: xScale.max,
        yMin: yScale.min,
        yMax: yScale.max,
        polylines: build(),
    };
    return entry.curve.polylines;
};

/**
 * Adds a trendline (fitter) to the dataset on the chart and optionally labels it with trend value.
 * @param {Object} datasetMeta - Metadata about the dataset.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Object} dataset - The dataset configuration from the chart.
 * @param {Scale} xScale - The x-axis scale object.
 * @param {Scale} yScale - The y-axis scale object.
 * @param {Map} [fitCache] - Optional per update cache so the regression is not
 *   refitted on every animation frame. Cleared by the plugin on chart update.
 */
const addFitter = (datasetMeta, ctx, dataset, xScale, yScale, fitCache) => {
    // Prefer the scale Chart.js bound the dataset to (linkScales stores it on
    // the meta). A lookup by id misses whenever the user names their axis —
    // `scales['y']` then resolves to the default scale Chart.js merges into
    // every chart, which is not the one the data is plotted against, and the
    // trendline ends up outside the chart area and is clipped away.
    const yScaleToUse =
        datasetMeta?.yScale ||
        datasetMeta?.controller?.chart?.scales?.[dataset.yAxisID || 'y'] ||
        yScale;

    // Determine if we're using exponential or linear trendline
    const isExponential = !!dataset.trendlineExponential;
    const trendlineConfig = dataset.trendlineExponential || dataset.trendlineLinear || {};

    const defaultColor = dataset.borderColor || 'rgba(169,169,169, .6)';
    const {
        colorMin = defaultColor,
        colorMax = defaultColor,
        width: lineWidth = dataset.borderWidth || 3,
        lineStyle = 'solid',
        fillColor = false,
    } = trendlineConfig;

    const {
        color = defaultColor,
        text = isExponential ? 'Exponential Trendline' : 'Trendline',
        display = true,
        displayValue = true,
        offset = 10,
        percentage = false,
    } = (trendlineConfig && trendlineConfig.label) || {};

    const {
        family = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
        size = 12,
    } = (trendlineConfig && trendlineConfig.label && trendlineConfig.label.font) || {};

    const chartOptions = datasetMeta.controller.chart.options;
    const parsingOptions =
        typeof chartOptions.parsing === 'object'
            ? chartOptions.parsing
            : undefined;
    const xAxisKey =
        trendlineConfig?.xAxisKey || parsingOptions?.xAxisKey || 'x';
    const yAxisKey =
        trendlineConfig?.yAxisKey || parsingOptions?.yAxisKey || 'y';

    // --- Data Point Collection and Validation ---
    // Fitting is O(points); reuse the cached fit when the plugin passed a cache
    // (the draw hook runs once per animation frame, an update runs once).
    const chartLabels = datasetMeta.controller.chart.data.labels;
    const fitOptions = {
        isExponential,
        trendoffset: trendlineConfig.trendoffset || 0,
        xScale,
        xAxisKey,
        yAxisKey,
        chartLabels,
    };
    const fitEntry = fitCache ? getCachedFit(fitCache, dataset, fitOptions) : null;
    const fitter = fitEntry ? fitEntry.fitter : buildFitter(dataset, fitOptions);

    // --- Trendline Coordinate Calculation ---
    // Ensure there are enough points to form a trendline.
    if (fitter.count < 2) {
        return; // Not enough data points to calculate a trendline.
    }

    const chartArea = datasetMeta.controller.chart.chartArea; // Defines the drawable area in pixels.

    // Where the label sits and which way it points. The two fits arrive at it
    // differently: a straight line has one midpoint and one angle, a curve has
    // a point on it.
    let labelAnchor;

    if (isExponential) {
        // --- Curve Sampling, Clipping and Drawing ---
        const buildCurve = () =>
            clipPolylineToArea(
                sampleExponentialPath(fitter, trendlineConfig, xScale, yScaleToUse, chartArea),
                chartArea
            );
        const polylines = fitEntry
            ? getCachedCurve(fitEntry, { trendlineConfig, xScale, yScale: yScaleToUse, chartArea }, buildCurve)
            : buildCurve();

        if (!polylines.length) return;

        ctx.lineWidth = lineWidth;
        setLineStyle(ctx, lineStyle);
        drawTrendlinePath({ ctx, polylines, colorMin, colorMax });

        if (fillColor) {
            fillBelowTrendlinePath({ ctx, polylines, drawBottom: chartArea.bottom, fillColor });
        }

        labelAnchor = curveLabelAnchor(polylines);
    } else {
        // --- Line Clipping and Drawing ---
        let { x1_px, y1_px, x2_px, y2_px } = calculateProjectedCoordinates(
            fitter, trendlineConfig, xScale, yScaleToUse, chartArea
        );

        let clippedCoords = null;
        if (isFinite(x1_px) && isFinite(y1_px) && isFinite(x2_px) && isFinite(y2_px)) {
            clippedCoords = liangBarskyClip(x1_px, y1_px, x2_px, y2_px, chartArea);
        }

        if (!clippedCoords) return;

        x1_px = clippedCoords.x1;
        y1_px = clippedCoords.y1;
        x2_px = clippedCoords.x2;
        y2_px = clippedCoords.y2;

        // A line shorter than half a pixel is not worth drawing.
        if (Math.abs(x1_px - x2_px) < 0.5 && Math.abs(y1_px - y2_px) < 0.5) return;

        ctx.lineWidth = lineWidth;
        setLineStyle(ctx, lineStyle);
        drawTrendline({ ctx, x1: x1_px, y1: y1_px, x2: x2_px, y2: y2_px, colorMin, colorMax });

        if (fillColor) {
            fillBelowTrendline(ctx, x1_px, y1_px, x2_px, y2_px, chartArea.bottom, fillColor);
        }

        labelAnchor = {
            x: (x1_px + x2_px) / 2,
            y: (y1_px + y2_px) / 2,
            angle: Math.atan2(y2_px - y1_px, x2_px - x1_px),
        };
    }

    if (trendlineConfig.label && display !== false) {
        let trendText = text;
        if (displayValue) {
            if (isExponential) {
                const coefficient = fitter.coefficient();
                const growthRate = fitter.growthRate();
                trendText = `${text} (a=${coefficient.toFixed(2)}, b=${growthRate.toFixed(2)})`;
            } else {
                const displaySlope = fitter.slope();
                trendText = `${text} (Slope: ${
                    percentage
                        ? (displaySlope * 100).toFixed(2) + '%'
                        : displaySlope.toFixed(2)
                })`;
            }
        }
        addTrendlineLabel(ctx, {
            label: trendText,
            x: labelAnchor.x,
            y: labelAnchor.y,
            angle: labelAnchor.angle,
            labelColor: color,
            family,
            size,
            offset,
        });
    }
};

/**
 * Clips a line segment to a rectangular clipping window using the Liang-Barsky algorithm.
 * This algorithm is efficient for 2D line clipping against an axis-aligned rectangle.
 * It determines the portion of the line segment (x1,y1)-(x2,y2) that is visible within
 * the rectangle defined by chartArea {left, right, top, bottom}.
 * @param {number} x1 - Pixel coordinate for the start of the line (x-axis).
 * @param {number} y1 - Pixel coordinate for the start of the line (y-axis).
 * @param {number} x2 - Pixel coordinate for the end of the line (x-axis).
 * @param {number} y2 - Pixel coordinate for the end of the line (y-axis).
 * @param {Object} chartArea - The chart area with { left, right, top, bottom } pixel boundaries.
 * @returns {Object|null} An object with { x1, y1, x2, y2 } of the clipped line, 
 *                        or null if the line is entirely outside the window or clipped to effectively a point.
 */
function liangBarskyClip(x1, y1, x2, y2, chartArea) {
    let dx = x2 - x1; // Change in x
    let dy = y2 - y1; // Change in y
    let t0 = 0.0;     // Parameter for the start of the clipped line segment (initially at x1, y1).
                      // Represents the proportion along the line from (x1,y1) to (x2,y2).
    let t1 = 1.0;     // Parameter for the end of the clipped line segment (initially at x2, y2).

    // p and q arrays are used in the Liang-Barsky algorithm conditions.
    // For each of the 4 clip edges (left, right, top, bottom):
    // p[k] * t >= q[k]
    // p values: -dx (left), dx (right), -dy (top), dy (bottom)
    // q values: x1 - x_min (left), x_max - x1 (right), y1 - y_min (top), y_max - y1 (bottom)
    // Note: Canvas y-coordinates increase downwards, so chartArea.top < chartArea.bottom.
    const p = [-dx, dx, -dy, dy];
    const q = [
        x1 - chartArea.left,    // q[0] for left edge check
        chartArea.right - x1,   // q[1] for right edge check
        y1 - chartArea.top,     // q[2] for top edge check
        chartArea.bottom - y1,  // q[3] for bottom edge check
    ];

    for (let i = 0; i < 4; i++) { // Iterate through the 4 clip edges (left, right, top, bottom).
        if (p[i] === 0) { // Line is parallel to the i-th clipping edge.
            if (q[i] < 0) { // Line is outside this parallel edge (e.g., for left edge, x1 < chartArea.left).
                return null; // Line is completely outside, so reject.
            }
            // If q[i] >= 0, line is inside or on the parallel edge, so this edge doesn't clip it. Continue.
        } else {
            const r = q[i] / p[i]; // Parameter t where the line intersects this edge's infinite line.
            if (p[i] < 0) { 
                // Line is potentially entering the clip region with respect to this edge.
                // (e.g., for left edge, -dx < 0 means line goes from left to right, dx > 0).
                // We want the largest t0 among all entry points.
                if (r > t1) return null; // Line enters after it has already exited from another edge.
                t0 = Math.max(t0, r);    // Update t0 to the latest entry point along the line.
            } else { // p[i] > 0
                // Line is potentially exiting the clip region with respect to this edge.
                // (e.g., for left edge, -dx > 0 means line goes from right to left, dx < 0).
                // We want the smallest t1 among all exit points.
                if (r < t0) return null; // Line exits before it has entered from another edge.
                t1 = Math.min(t1, r);    // Update t1 to the earliest exit point along the line.
            }
        }
    }

    // After checking all 4 edges:
    // If t0 > t1, the line segment is completely outside the clipping window or is degenerate.
    if (t0 > t1) return null; 

    // Calculate the new clipped coordinates using parameters t0 and t1.
    // (x1_clipped, y1_clipped) = (x1, y1) + t0 * (dx, dy)
    // (x2_clipped, y2_clipped) = (x1, y1) + t1 * (dx, dy)
    const clippedX1 = x1 + t0 * dx;
    const clippedY1 = y1 + t0 * dy;
    const clippedX2 = x1 + t1 * dx;
    const clippedY2 = y1 + t1 * dy;

    return { x1: clippedX1, y1: clippedY1, x2: clippedX2, y2: clippedY2 };
}
// Removed adjustLineForOverflow function

/**
 * Generates an accessible description string for a trendline.
 * @param {Object} fitter - The LineFitter or ExponentialFitter instance.
 * @param {Object} dataset - The chart dataset configuration.
 * @param {boolean} isExponential - Whether this is an exponential trendline.
 * @returns {string} A human-readable description for screen readers.
 */

/**
 * Generates an accessible description for all trendlines in a chart.
 * Aggregates descriptions from all datasets that have trendline configurations.
 * @param {Chart} chartInstance - The Chart.js chart instance.
 * @returns {string} Combined description for all trendlines.
 */
function generateChartTrendlineDescription(chartInstance) {
    const descriptions = [];

    chartInstance.data.datasets.forEach((dataset) => {
        const isExponential = !!dataset.trendlineExponential;
        const config = dataset.trendlineExponential || dataset.trendlineLinear;

        if (!config) return;

        // If explicit a11y description is provided, use it
        if (config.accessibility && config.accessibility.description) {
            descriptions.push(config.accessibility.description);
            return;
        }

        // Build a description from the config
        const dataLabel = dataset.label || 'Dataset';
        const trendType = isExponential ? 'Exponential trendline' : 'Linear trendline';

        if (config.accessibility && config.accessibility.label) {
            descriptions.push(`${trendType} for ${dataLabel}: ${config.accessibility.label}`);
        } else {
            descriptions.push(`${trendType} for ${dataLabel}.`);
        }
    });

    return descriptions.join(' ');
}

/**
 * Applies ARIA attributes to the chart canvas for trendline accessibility.
 * Sets role="img" and a descriptive aria-label on the canvas element.
 * @param {Chart} chartInstance - The Chart.js chart instance.
 */
function applyCanvasAccessibility(chartInstance) {
    const canvas = chartInstance.canvas;
    if (!canvas) return;

    // Set role="img" for screen readers to treat canvas as an image
    canvas.setAttribute('role', 'img');

    // Generate and apply description
    const description = generateChartTrendlineDescription(chartInstance);
    if (description) {
        // Preserve the original user-provided aria-label so repeated calls
        // (afterInit + afterUpdate) don't accumulate duplicate descriptions.
        // See: https://github.com/Makanz/chartjs-plugin-trendline/issues/152
        if (!canvas.hasAttribute('data-trendline-original-label')) {
            canvas.setAttribute(
                'data-trendline-original-label',
                canvas.getAttribute('aria-label') || ''
            );
        }
        const originalLabel = canvas.getAttribute('data-trendline-original-label') || '';
        canvas.setAttribute(
            'aria-label',
            originalLabel ? `${originalLabel}. ${description}` : description
        );
    }
}

/**
 * Creates a legend item object from a dataset's trendline configuration.
 * Returns null when no legend item should be added.
 * @param {object} dataset - The chart dataset
 * @param {object} [trendlineConfig] - The trendline config (trendlineLinear or trendlineExponential)
 * @returns {object|null} Legend item object or null
 */
function createLegendItemFromTrendline(dataset, trendlineConfig) {
    if (!trendlineConfig) return null;

    const legendConfig = trendlineConfig.legend;
    if (!legendConfig || legendConfig.display === false) return null;

    return {
        text: legendConfig.text || dataset.label || 'Trendline',
        strokeStyle:
            legendConfig.strokeStyle ||
            legendConfig.color ||
            dataset.borderColor ||
            'rgba(169,169,169, .6)',
        fillStyle: legendConfig.fillStyle || 'transparent',
        lineCap: legendConfig.lineCap || 'butt',
        lineDash: legendConfig.lineDash || [],
        lineWidth: legendConfig.lineWidth ?? legendConfig.width ?? 1,
    };
}

/**
 * Per chart caches, valid for one chart.update(): the draw hook runs on every
 * animation frame, so neither the regression fit nor the dataset ordering
 * should be recomputed per frame. `beforeUpdate` throws the cache away.
 * @type {WeakMap<Chart, {fits: Map, sortedDatasets: Array|null}>}
 */
const chartCaches = new WeakMap();

const getChartCache = (chartInstance) => {
    let cache = chartCaches.get(chartInstance);
    if (!cache) {
        cache = { fits: new Map(), sortedDatasets: null };
        chartCaches.set(chartInstance, cache);
    }
    return cache;
};

const resetChartCache = (chartInstance) => {
    chartCaches.delete(chartInstance);
};

/**
 * Returns the trendline datasets in drawing order.
 * @param {Array} datasets - chart.data.datasets
 * @returns {Array<{dataset: object, index: number}>} Sorted entries
 */
const sortTrendlineDatasets = (datasets) =>
    datasets
        .map((dataset, index) => ({ dataset, index }))
        .filter((entry) => entry.dataset.trendlineLinear || entry.dataset.trendlineExponential)
        .sort((a, b) => {
            const orderA = a.dataset.order ?? 0;
            const orderB = b.dataset.order ?? 0;

            // Push 0-order datasets to the end (they draw last / on top)
            if (orderA === 0 && orderB !== 0) return 1;
            if (orderB === 0 && orderA !== 0) return -1;

            // Otherwise, draw lower order first
            return orderA - orderB;
        });

const pluginTrendlineLinear = {
    id: 'chartjs-plugin-trendline',

    afterDatasetsDraw: (chartInstance) => {
        const ctx = chartInstance.ctx;
        const { xScale, yScale } = getScales(chartInstance);
        const cache = getChartCache(chartInstance);

        // Ordering is stable between updates, so it is computed once per update
        // instead of on every animation frame.
        if (!cache.sortedDatasets) {
            cache.sortedDatasets = sortTrendlineDatasets(chartInstance.data.datasets);
        }

        cache.sortedDatasets.forEach(({ dataset, index }) => {
            const showTrendline =
                dataset.alwaysShowTrendline ||
                chartInstance.isDatasetVisible(index);

            if (!showTrendline || dataset.data.length <= 1) return;

            const datasetMeta = chartInstance.getDatasetMeta(index);

            // Chart.js resolves which scale a dataset is bound to in
            // linkScales() and stores it on the meta. Prefer that over a lookup
            // by name: the scale id is not necessarily 'x' (a chart may name its
            // axis `date` or `temperature`), and with several horizontal scales
            // there is no single right answer for getScales() to return.
            const datasetXScale =
                datasetMeta.xScale ||
                chartInstance.scales?.[dataset.xAxisID || 'x'] ||
                xScale;

            addFitter(datasetMeta, ctx, dataset, datasetXScale, yScale, cache.fits);
        });

        // Reset to solid line after drawing trendline
        ctx.setLineDash([]);
    },

    afterInit: (chartInstance) => {
        applyCanvasAccessibility(chartInstance);
    },

    afterUpdate: (chartInstance) => {
        applyCanvasAccessibility(chartInstance);
    },

    beforeUpdate: (chartInstance) => {
        // New data, scales or options: drop the cached fit and ordering.
        resetChartCache(chartInstance);
    },

    beforeDestroy: (chartInstance) => {
        resetChartCache(chartInstance);
    },

    beforeInit: (chartInstance) => {
        const datasets = chartInstance.data.datasets;
        const hasLegendConfig = datasets.some((dataset) => {
            const trendlineConfig = dataset.trendlineLinear || dataset.trendlineExponential;
            return createLegendItemFromTrendline(dataset, trendlineConfig) !== null;
        });

        if (!hasLegendConfig) return;

        // The legend plugin may be disabled (plugins.legend.display: false), in
        // which case chart.legend is undefined.
        const legendLabels = chartInstance.legend?.options?.labels;
        if (!legendLabels) return;

        const originalGenerateLabels = legendLabels.generateLabels;

        legendLabels.generateLabels = function (chart) {
            const defaultLabels = originalGenerateLabels(chart);

            chart.data.datasets.forEach((dataset) => {
                const trendlineConfig = dataset.trendlineLinear || dataset.trendlineExponential;
                const item = createLegendItemFromTrendline(dataset, trendlineConfig);
                if (item) {
                    defaultLabels.push(item);
                }
            });

            return defaultLabels;
        };
    },
};

// Auto-register plugin when Chart.js is available in the browser
if (typeof window !== 'undefined') {
    const Chart = window.Chart;
    if (Chart) {
        if (typeof Chart.register === 'function') {
            Chart.register(pluginTrendlineLinear);
        } else {
            Chart.plugins.register(pluginTrendlineLinear);
        }
    }
}

export { pluginTrendlineLinear as default };
