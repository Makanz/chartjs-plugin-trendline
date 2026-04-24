import { LineFitter } from '../utils/lineFitter.js';
import { ExponentialFitter } from '../utils/exponentialFitter.js';
import { drawTrendline, fillBelowTrendline, setLineStyle } from '../utils/drawing.js';
import { addTrendlineLabel } from './label.js';

/**
 * Gets the appropriate yScale based on dataset yAxisID or falls back to default yScale.
 * @param {Object} datasetMeta - Metadata about the dataset.
 * @param {Object} dataset - The dataset configuration.
 * @param {Object} yScale - The default y-scale object.
 * @returns {Object} The y-scale to use for drawing.
 */
function getYScale(datasetMeta, dataset, yScale) {
    const yAxisID = dataset.yAxisID || 'y';
    return datasetMeta.controller.chart.scales[yAxisID] || yScale;
}

/**
 * Extracts trendline configuration from dataset.
 * @param {Object} dataset - The dataset configuration.
 * @returns {Object} The trendline configuration object.
 */
function getTrendlineConfig(dataset) {
    return dataset.trendlineExponential || dataset.trendlineLinear || {};
}

/**
 * Extracts label configuration from trendline config.
 * @param {Object} trendlineConfig - The trendline configuration.
 * @param {boolean} isExponential - Whether the trendline is exponential.
 * @returns {Object} The label configuration.
 */
function getLabelConfig(trendlineConfig, isExponential) {
    const defaultColor = 'rgba(169,169,169, .6)';
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

    return { color, text, display, displayValue, offset, percentage, family, size };
}

/**
 * Creates the appropriate fitter instance (LineFitter or ExponentialFitter).
 * @param {boolean} isExponential - Whether to create an exponential fitter.
 * @returns {Object} The fitter instance.
 */
function createFitter(isExponential) {
    return isExponential ? new ExponentialFitter() : new LineFitter();
}

/**
 * Collects and validates data points for the fitter, handling trendoffset and various data formats.
 * @param {Object} fitter - The fitter instance.
 * @param {Object} dataset - The dataset configuration.
 * @param {Object} datasetMeta - Metadata about the dataset.
 * @param {Object} xScale - The x-scale object.
 * @param {Object} yScaleToUse - The y-scale to use.
 * @returns {boolean} Whether enough data points were collected.
 */
function collectDataPoints(fitter, dataset, datasetMeta, xScale, yScaleToUse) {
    const trendlineConfig = getTrendlineConfig(dataset);
    let trendoffset = trendlineConfig.trendoffset || 0;

    // Sanitize trendoffset
    if (Math.abs(trendoffset) >= dataset.data.length) trendoffset = 0;

    // Determine effective first index
    let effectiveFirstIndex = 0;
    if (trendoffset > 0) {
        const firstNonNullAfterOffset = dataset.data.slice(trendoffset).findIndex((d) => d !== undefined && d !== null);
        if (firstNonNullAfterOffset !== -1) {
            effectiveFirstIndex = trendoffset + firstNonNullAfterOffset;
        } else {
            effectiveFirstIndex = dataset.data.length;
        }
    } else {
        const firstNonNull = dataset.data.findIndex((d) => d !== undefined && d !== null);
        if (firstNonNull !== -1) {
            effectiveFirstIndex = firstNonNull;
        } else {
            effectiveFirstIndex = dataset.data.length;
        }
    }

    // Determine data structure type
    let xy = effectiveFirstIndex < dataset.data.length && typeof dataset.data[effectiveFirstIndex] === 'object';

    // Get chart options for parsing
    const chartOptions = datasetMeta.controller.chart.options;
    const parsingOptions = typeof chartOptions.parsing === 'object' ? chartOptions.parsing : undefined;
    const xAxisKey = trendlineConfig?.xAxisKey || parsingOptions?.xAxisKey || 'x';
    const yAxisKey = trendlineConfig?.yAxisKey || parsingOptions?.yAxisKey || 'y';

    // Collect points
    dataset.data.forEach((data, index) => {
        if (data == null) return;

        // Apply trendoffset logic
        if (trendoffset > 0 && index < effectiveFirstIndex) return;
        if (trendoffset < 0 && index >= dataset.data.length + trendoffset) return;

        // Process data based on scale type and data structure
        if (['time', 'timeseries'].includes(xScale.options.type) && xy) {
            let x = data[xAxisKey] != null ? data[xAxisKey] : data.t;
            const yValue = data[yAxisKey];

            if (x != null && x !== undefined && yValue != null && !isNaN(yValue)) {
                fitter.add(new Date(x).getTime(), yValue);
            }
        } else if (xy) {
            const xVal = data[xAxisKey];
            const yVal = data[yAxisKey];

            const xIsValid = xVal != null && !isNaN(xVal);
            const yIsValid = yVal != null && !isNaN(yVal);

            if (xIsValid && yIsValid) {
                fitter.add(xVal, yVal);
            }
        } else if (['time', 'timeseries'].includes(xScale.options.type) && !xy) {
            const chartLabels = datasetMeta.controller.chart.data.labels;
            if (chartLabels && chartLabels[index] && data != null && !isNaN(data)) {
                const timeValue = new Date(chartLabels[index]).getTime();
                if (!isNaN(timeValue)) {
                    fitter.add(timeValue, data);
                }
            }
        } else {
            if (data != null && !isNaN(data)) {
                fitter.add(index, data);
            }
        }
    });

    return fitter.count >= 2;
}

/**
 * Calculates trendline coordinates based on projection mode.
 * @param {Object} fitter - The fitter instance.
 * @param {Object} xScale - The x-scale object.
 * @param {Object} yScaleToUse - The y-scale to use.
 * @param {Object} chartArea - The chart area.
 * @param {boolean} isExponential - Whether the trendline is exponential.
 * @param {Object} trendlineConfig - The trendline configuration.
 * @returns {Object|null} The clipped coordinates or null if invalid.
 */
function calculateTrendlineCoordinates(fitter, xScale, yScaleToUse, chartArea, isExponential, trendlineConfig) {
    let x1_px, y1_px, x2_px, y2_px;

    if (trendlineConfig.projection) {
        let points = [];

        if (isExponential) {
            const val_x_left = xScale.getValueForPixel(chartArea.left);
            const y_at_left = fitter.f(val_x_left);
            points.push({ x: val_x_left, y: y_at_left });

            const val_x_right = xScale.getValueForPixel(chartArea.right);
            const y_at_right = fitter.f(val_x_right);
            points.push({ x: val_x_right, y: y_at_right });
        } else {
            const slope = fitter.slope();
            const intercept = fitter.intercept();

            if (Math.abs(slope) > 1e-6) {
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
        }

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
}

/**
 * Clips line coordinates to the chart area using Liang-Barsky algorithm.
 * @param {number} x1 - Starting x-coordinate.
 * @param {number} y1 - Starting y-coordinate.
 * @param {number} x2 - Ending x-coordinate.
 * @param {number} y2 - Ending y-coordinate.
 * @param {Object} chartArea - The chart area.
 * @returns {Object|null} Clipped coordinates or null if line is outside.
 */
function clipCoordinates(x1, y1, x2, y2, chartArea) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let t0 = 0.0;
    let t1 = 1.0;

    const p = [-dx, dx, -dy, dy];
    const q = [
        x1 - chartArea.left,
        chartArea.right - x1,
        y1 - chartArea.top,
        chartArea.bottom - y1,
    ];

    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) return null;
        } else {
            const r = q[i] / p[i];
            if (p[i] < 0) {
                if (r > t1) return null;
                t0 = Math.max(t0, r);
            } else {
                if (r < t0) return null;
                t1 = Math.min(t1, r);
            }
        }
    }

    if (t0 > t1) return null;

    const clippedX1 = x1 + t0 * dx;
    const clippedY1 = y1 + t0 * dy;
    const clippedX2 = x1 + t1 * dx;
    const clippedY2 = y1 + t1 * dy;

    return { x1: clippedX1, y1: clippedY1, x2: clippedX2, y2: clippedY2 };
}

/**
 * Draws the trendline and fills below it if configured.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Object} coords - The trendline coordinates.
 * @param {Object} chartArea - The chart area.
 * @param {Object} trendlineConfig - The trendline configuration.
 */
function drawTrendlineAndFill(ctx, coords, chartArea, trendlineConfig) {
    const { x1_px, y1_px, x2_px, y2_px } = coords;
    const lineWidth = trendlineConfig.width || 3;
    const lineStyle = trendlineConfig.lineStyle || 'solid';
    const fillColor = trendlineConfig.fillColor || false;
    const colorMin = trendlineConfig.colorMin || trendlineConfig.color || 'rgba(169,169,169, .6)';
    const colorMax = trendlineConfig.colorMax || trendlineConfig.color || 'rgba(169,169,169, .6)';

    ctx.lineWidth = lineWidth;
    setLineStyle(ctx, lineStyle);
    drawTrendline({ ctx, x1: x1_px, y1: y1_px, x2: x2_px, y2: y2_px, colorMin, colorMax });

    if (fillColor) {
        fillBelowTrendline(ctx, x1_px, y1_px, x2_px, y2_px, chartArea.bottom, fillColor);
    }
}

/**
 * Adds a label to the trendline if configured.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Object} fitter - The fitter instance.
 * @param {Object} coords - The trendline coordinates.
 * @param {Object} trendlineConfig - The trendline configuration.
 * @param {Object} labelConfig - The label configuration.
 * @param {boolean} isExponential - Whether the trendline is exponential.
 */
function addLabelIfNeeded(ctx, fitter, coords, trendlineConfig, labelConfig, isExponential) {
    // Only add label if trendlineConfig.label exists and display is not false
    if (!trendlineConfig.label || labelConfig.display === false) return;

    const angle = Math.atan2(coords.y2_px - coords.y1_px, coords.x2_px - coords.x1_px);
    let trendText = labelConfig.text;

    if (labelConfig.displayValue) {
        if (isExponential) {
            const coefficient = fitter.coefficient();
            const growthRate = fitter.growthRate();
            trendText = `${labelConfig.text} (a=${coefficient.toFixed(2)}, b=${growthRate.toFixed(2)})`;
        } else {
            const displaySlope = fitter.slope();
            trendText = `${labelConfig.text} (Slope: ${
                labelConfig.percentage
                    ? (displaySlope * 100).toFixed(2) + '%'
                    : displaySlope.toFixed(2)
            })`;
        }
    }

    addTrendlineLabel(
        ctx,
        trendText,
        coords.x1_px,
        coords.y1_px,
        coords.x2_px,
        coords.y2_px,
        angle,
        labelConfig.color,
        labelConfig.family,
        labelConfig.size,
        labelConfig.offset
    );
}

/**
 * Adds a trendline (fitter) to the dataset on the chart and optionally labels it with trend value.
 * @param {Object} datasetMeta - Metadata about the dataset.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Object} dataset - The dataset configuration from the chart.
 * @param {Scale} xScale - The x-axis scale object.
 * @param {Scale} yScale - The y-axis scale object.
 */
export const addFitter = (datasetMeta, ctx, dataset, xScale, yScale) => {
    const yScaleToUse = getYScale(datasetMeta, dataset, yScale);
    const isExponential = !!dataset.trendlineExponential;
    const trendlineConfig = getTrendlineConfig(dataset);
    const labelConfig = getLabelConfig(trendlineConfig, isExponential);

    const fitter = createFitter(isExponential);

    // Collect data points
    const hasEnoughPoints = collectDataPoints(fitter, dataset, datasetMeta, xScale, yScaleToUse);
    if (!hasEnoughPoints) return;

    // Calculate trendline coordinates
    const chartArea = datasetMeta.controller.chart.chartArea;
    const coords = calculateTrendlineCoordinates(fitter, xScale, yScaleToUse, chartArea, isExponential, trendlineConfig);

    // Check if coordinates are valid
    if (!isFinite(coords.x1_px) || !isFinite(coords.y1_px) || !isFinite(coords.x2_px) || !isFinite(coords.y2_px)) {
        return;
    }

    // Clip coordinates to chart area
    const clippedCoords = clipCoordinates(coords.x1_px, coords.y1_px, coords.x2_px, coords.y2_px, chartArea);

    if (clippedCoords) {
        const clippedX1 = clippedCoords.x1;
        const clippedY1 = clippedCoords.y1;
        const clippedX2 = clippedCoords.x2;
        const clippedY2 = clippedCoords.y2;

        // Check if line is not too short
        if (Math.abs(clippedX1 - clippedX2) < 0.5 && Math.abs(clippedY1 - clippedY2) < 0.5) {
            return;
        }

        const clippedCoordsObj = { x1_px: clippedX1, y1_px: clippedY1, x2_px: clippedX2, y2_px: clippedY2 };
        drawTrendlineAndFill(ctx, clippedCoordsObj, chartArea, trendlineConfig);
        addLabelIfNeeded(ctx, fitter, clippedCoordsObj, trendlineConfig, labelConfig, isExponential);
    }
};
