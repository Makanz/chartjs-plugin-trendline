/**
 * Retrieves the x and y scales from the chart instance.
 * @param {Chart} chartInstance - The chart instance.
 * @returns {Object} - The xScale and yScale of the chart.
 */
export const getScales = (chartInstance) => {
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
export const setLineStyle = (ctx, lineStyle) => {
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
export const drawTrendline = ({ ctx, x1, y1, x2, y2, colorMin, colorMax }) => {
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
export const drawTrendlinePath = ({ ctx, polylines, colorMin, colorMax }) => {
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
export const fillBelowTrendlinePath = ({ ctx, polylines, drawBottom, fillColor }) => {
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
export const fillBelowTrendline = (ctx, x1, y1, x2, y2, drawBottom, fillColor) => {
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