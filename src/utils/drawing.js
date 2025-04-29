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
    // Ensure all values are finite numbers
    if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) {
        console.warn(
            'Cannot draw trendline: coordinates contain non-finite values',
            { x1, y1, x2, y2 }
        );
        return;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    try {
        let gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, colorMin);
        gradient.addColorStop(1, colorMax);
        ctx.strokeStyle = gradient;
    } catch (e) {
        // Fallback to solid color if gradient creation fails
        console.warn('Gradient creation failed, using solid color:', e);
        ctx.strokeStyle = colorMin;
    }

    ctx.stroke();
    ctx.closePath();
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
    // Ensure all values are finite numbers
    if (
        !isFinite(x1) ||
        !isFinite(y1) ||
        !isFinite(x2) ||
        !isFinite(y2) ||
        !isFinite(drawBottom)
    ) {
        console.warn(
            'Cannot fill below trendline: coordinates contain non-finite values',
            { x1, y1, x2, y2, drawBottom }
        );
        return;
    }

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