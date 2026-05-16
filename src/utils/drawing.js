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

    try {
        // Additional validation for degenerate gradients
        const dx = x2 - x1;
        const dy = y2 - y1;
        const gradientLength = Math.sqrt(dx * dx + dy * dy);
        
        // If the gradient vector is too small, createLinearGradient may fail
        if (gradientLength < 0.01) {
            console.warn('Gradient vector too small, using solid color:', { x1, y1, x2, y2, length: gradientLength });
            ctx.strokeStyle = colorMin;
        } else {
            let gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, colorMin);
            gradient.addColorStop(1, colorMax);
            ctx.strokeStyle = gradient;
        }
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