/*!
 * chartjs-plugin-trendline.js
 * Version: 2.1.9
 *
 * Copyright 2025 Marcus Alsterfjord
 * Released under the MIT license
 * https://github.com/Makanz/chartjs-plugin-trendline/blob/master/README.md
 *
 * Modified by @vesal: accept xy-data from scatter,
 * Modified by @Megaemce: add label and basic legend to trendline, add JSDoc,
 */

/**
 * Chart.js plugin to draw linear trendlines on datasets.
 */
const pluginTrendlineLinear = {
    id: 'chartjs-plugin-trendline',

    /**
     * Hook that is called after datasets are drawn.
     * Adds trendlines to the datasets that have `trendlineLinear` configured.
     * @param {Chart} chartInstance - The chart instance where datasets are drawn.
     */
    afterDatasetsDraw: (chartInstance) => {
        const ctx = chartInstance.ctx;
        const { xScale, yScale } = getScales(chartInstance);

        const sortedDatasets = chartInstance.data.datasets
            .map((dataset, index) => ({ dataset, index }))
            .filter((entry) => entry.dataset.trendlineLinear)
            .sort((a, b) => {
                const orderA = a.dataset.order ?? 0;
                const orderB = b.dataset.order ?? 0;

                // Push 0-order datasets to the end (they draw last / on top)
                if (orderA === 0 && orderB !== 0) return 1;
                if (orderB === 0 && orderA !== 0) return -1;

                // Otherwise, draw lower order first
                return orderA - orderB;
            });

        sortedDatasets.forEach(({ dataset, index }) => {
            const showTrendline =
                dataset.alwaysShowTrendline ||
                chartInstance.isDatasetVisible(index);

            if (showTrendline && dataset.data.length > 1) {
                const datasetMeta = chartInstance.getDatasetMeta(index);
                addFitter(datasetMeta, ctx, dataset, xScale, yScale);
            }
        });

        // Reset to solid line after drawing trendline
        ctx.setLineDash([]);
    },

    beforeInit: (chartInstance) => {
        const datasets = chartInstance.data.datasets;

        datasets.forEach((dataset) => {
            if (dataset.trendlineLinear && dataset.trendlineLinear.label) {
                const label = dataset.trendlineLinear.label;

                // Access chartInstance to update legend labels
                const originalGenerateLabels =
                    chartInstance.legend.options.labels.generateLabels;

                chartInstance.legend.options.labels.generateLabels = function (
                    chart
                ) {
                    const defaultLabels = originalGenerateLabels(chart);

                    const legendConfig = dataset.trendlineLinear.legend;

                    // Display the legend is it's populated and not set to hidden
                    if (legendConfig && legendConfig.display !== false) {
                        defaultLabels.push({
                            text: legendConfig.text || label + ' (Trendline)',
                            strokeStyle:
                                legendConfig.color ||
                                dataset.borderColor ||
                                'rgba(169,169,169, .6)',
                            fillStyle: legendConfig.fillStyle || 'transparent',
                            lineCap: legendConfig.lineCap || 'butt',
                            lineDash: legendConfig.lineDash || [],
                            lineWidth: legendConfig.width || 1,
                        });
                    }
                    return defaultLabels;
                };
            }
        });
    },
};

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
 * Adds a trendline (fitter) to the dataset on the chart and optionally labels it with trend value.
 * @param {Object} datasetMeta - Metadata about the dataset.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Object} dataset - The dataset configuration from the chart.
 * @param {Scale} xScale - The x-axis scale object.
 * @param {Scale} yScale - The y-axis scale object.
 */
const addFitter = (datasetMeta, ctx, dataset, xScale, yScale) => {
    const yAxisID = dataset.yAxisID || 'y'; // Default to 'y' if no yAxisID is specified
    const yScaleToUse = datasetMeta.controller.chart.scales[yAxisID] || yScale;

    const defaultColor = dataset.borderColor || 'rgba(169,169,169, .6)';
    const {
        colorMin = defaultColor,
        colorMax = defaultColor,
        width: lineWidth = dataset.borderWidth || 3,
        lineStyle = 'solid',
        fillColor = false,
    } = dataset.trendlineLinear || {};

    const {
        color = defaultColor,
        text = 'Trendline',
        display = true,
        displayValue = true,
        offset = 10,
        percentage = false,
    } = dataset.trendlineLinear.label || {};

    const {
        family = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
        size = 12,
    } = dataset.trendlineLinear.label?.font || {};

    const chartOptions = datasetMeta.controller.chart.options;
    const parsingOptions =
        typeof chartOptions.parsing === 'object'
            ? chartOptions.parsing
            : undefined;
    const xAxisKey =
        dataset.trendlineLinear?.xAxisKey || parsingOptions?.xAxisKey || 'x';
    const yAxisKey =
        dataset.trendlineLinear?.yAxisKey || parsingOptions?.yAxisKey || 'y';

    let fitter = new LineFitter();
    let firstIndex = dataset.data.findIndex(
        (d) => d !== undefined && d !== null
    );
    let lastIndex = dataset.data.length - 1;
    let startPos = datasetMeta.data[firstIndex]?.[xAxisKey];
    let endPos = datasetMeta.data[lastIndex]?.[xAxisKey];
    let xy = typeof dataset.data[firstIndex] === 'object';

    // Collect data points for the fitter
    dataset.data.forEach((data, index) => {
        if (data == null) return;

        if (['time', 'timeseries'].includes(xScale.options.type)) {
            let x = data[xAxisKey] != null ? data[xAxisKey] : data.t;
            if (x !== undefined) {
                fitter.add(new Date(x).getTime(), data[yAxisKey]);
            } else {
                fitter.add(index, data);
            }
        } else if (xy) {
            if (!isNaN(data.x) && !isNaN(data.y)) {
                fitter.add(data.x, data.y);
            } else if (!isNaN(data.x)) {
                fitter.add(index, data.x);
            } else if (!isNaN(data.y)) {
                fitter.add(index, data.y);
            }
        } else {
            fitter.add(index, data);
        }
    });

    // Calculate the pixel coordinates for the trendline
    let x1 = isFinite(startPos)
        ? startPos
        : xScale.getPixelForValue(fitter.minx);
    let y1 = yScaleToUse.getPixelForValue(fitter.f(fitter.minx));
    let x2, y2;

    // Projection logic for trendline
    if (dataset.trendlineLinear.projection && fitter.scale() < 0) {
        let x2value = fitter.fo();
        if (x2value < fitter.minx) x2value = fitter.maxx;
        x2 = xScale.getPixelForValue(x2value);
        y2 = yScaleToUse.getPixelForValue(fitter.f(x2value));
    } else {
        x2 = isFinite(endPos) ? endPos : xScale.getPixelForValue(fitter.maxx);
        y2 = yScaleToUse.getPixelForValue(fitter.f(fitter.maxx));
    }

    const drawBottom = datasetMeta.controller.chart.chartArea.bottom;
    const chartWidth = datasetMeta.controller.chart.width;

    // Only adjust line for overflow if coordinates are valid
    if (isFinite(x1) && isFinite(y1) && isFinite(x2) && isFinite(y2)) {
        adjustLineForOverflow({ x1, y1, x2, y2, drawBottom, chartWidth });

        // Set line width and styles
        ctx.lineWidth = lineWidth;
        setLineStyle(ctx, lineStyle);

        // Draw the trendline
        drawTrendline({ ctx, x1, y1, x2, y2, colorMin, colorMax });

        // Optionally fill below the trendline
        if (fillColor) {
            fillBelowTrendline(ctx, x1, y1, x2, y2, drawBottom, fillColor);
        }

        // Calculate the angle of the trendline
        const angle = Math.atan2(y2 - y1, x2 - x1);

        // Calculate the slope of the trendline (value of trend)
        const slope = (y1 - y2) / (x2 - x1);

        // Add the label to the trendline if it's populated and not set to hidden
        if (dataset.trendlineLinear.label && display !== false) {
            const trendText = displayValue
                ? `${text} (Slope: ${
                      percentage
                          ? (slope * 100).toFixed(2) + '%'
                          : slope.toFixed(2)
                  })`
                : text;
            addTrendlineLabel(
                ctx,
                trendText,
                x1,
                y1,
                x2,
                y2,
                angle,
                color,
                family,
                size,
                offset
            );
        }
    }
};

/**
 * Adds a label to the trendline at the calculated angle.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {string} label - The label text to add.
 * @param {number} x1 - The starting x-coordinate of the trendline.
 * @param {number} y1 - The starting y-coordinate of the trendline.
 * @param {number} x2 - The ending x-coordinate of the trendline.
 * @param {number} y2 - The ending y-coordinate of the trendline.
 * @param {number} angle - The angle (in radians) of the trendline.
 * @param {string} labelColor - The color of the label text.
 * @param {string} family - The font family for the label text.
 * @param {number} size - The font size for the label text.
 * @param {number} offset - The offset of the label from the trendline
 */
const addTrendlineLabel = (
    ctx,
    label,
    x1,
    y1,
    x2,
    y2,
    angle,
    labelColor,
    family,
    size,
    offset
) => {
    // Set the label font and color
    ctx.font = `${size}px ${family}`;
    ctx.fillStyle = labelColor;

    // Label width
    const labelWidth = ctx.measureText(label).width;

    // Calculate the center of the trendline
    const labelX = (x1 + x2) / 2;
    const labelY = (y1 + y2) / 2;

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
 * Adjusts the line if it overflows below the chart bottom.
 * @param {Object} params - The line parameters.
 * @param {number} params.x1 - Starting x-coordinate of the trendline.
 * @param {number} params.y1 - Starting y-coordinate of the trendline.
 * @param {number} params.x2 - Ending x-coordinate of the trendline.
 * @param {number} params.y2 - Ending y-coordinate of the trendline.
 * @param {number} params.drawBottom - Bottom boundary of the chart.
 * @param {number} params.chartWidth - Width of the chart.
 */
const adjustLineForOverflow = ({ x1, y1, x2, y2, drawBottom, chartWidth }) => {
    if (y1 > drawBottom) {
        let diff = y1 - drawBottom;
        let lineHeight = y1 - y2;
        let overlapPercentage = diff / lineHeight;
        let addition = chartWidth * overlapPercentage;

        y1 = drawBottom;
        x1 = x1 + addition;
    } else if (y2 > drawBottom) {
        let diff = y2 - drawBottom;
        let lineHeight = y2 - y1;
        let overlapPercentage = diff / lineHeight;
        let subtraction = chartWidth - chartWidth * overlapPercentage;

        y2 = drawBottom;
        x2 = chartWidth - (x2 - subtraction);
    }
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
const fillBelowTrendline = (ctx, x1, y1, x2, y2, drawBottom, fillColor) => {
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

/**
 * A class that fits a line to a series of points using least squares.
 */
class LineFitter {
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

// If we're in the browser and have access to the global Chart obj, register plugin automatically
if (typeof window !== 'undefined' && window.Chart) {
    if (window.Chart.hasOwnProperty('register')) {
        window.Chart.register(pluginTrendlineLinear);
    } else {
        window.Chart.plugins.register(pluginTrendlineLinear);
    }
}

// Otherwise, try to export the plugin
try {
    module.exports = exports = pluginTrendlineLinear;
} catch (e) {}
