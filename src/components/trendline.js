import { LineFitter } from '../utils/lineFitter';
import { drawTrendline, fillBelowTrendline, setLineStyle } from '../utils/drawing';
import { addTrendlineLabel } from './label';

/**
 * Adds a trendline (fitter) to the dataset on the chart and optionally labels it with trend value.
 * @param {Object} datasetMeta - Metadata about the dataset.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Object} dataset - The dataset configuration from the chart.
 * @param {Scale} xScale - The x-axis scale object.
 * @param {Scale} yScale - The y-axis scale object.
 */
export const addFitter = (datasetMeta, ctx, dataset, xScale, yScale) => {
    const yAxisID = dataset.yAxisID || 'y'; // Default to 'y' if no yAxisID is specified
    const yScaleToUse = datasetMeta.controller.chart.scales[yAxisID] || yScale;

    const defaultColor = dataset.borderColor || 'rgba(169,169,169, .6)';
    const {
        colorMin = defaultColor,
        colorMax = defaultColor,
        width: lineWidth = dataset.borderWidth || 3,
        lineStyle = 'solid',
        fillColor = false,
        // trendoffset is now handled separately
    } = dataset.trendlineLinear || {};
    let trendoffset = (dataset.trendlineLinear || {}).trendoffset || 0;

    const {
        color = defaultColor,
        text = 'Trendline',
        display = true,
        displayValue = true,
        offset = 10,
        percentage = false,
    } = (dataset.trendlineLinear && dataset.trendlineLinear.label) || {};

    const {
        family = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
        size = 12,
    } = (dataset.trendlineLinear && dataset.trendlineLinear.label && dataset.trendlineLinear.label.font) || {};

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
    
    // --- Data Point Collection and Validation for LineFitter ---

    // Sanitize trendoffset: if its absolute value is too large, reset to 0.
    // This prevents errors if offset is out of bounds of the dataset length.
    if (Math.abs(trendoffset) >= dataset.data.length) trendoffset = 0;
    
    // Determine the actual starting index for data processing if a positive trendoffset is applied.
    // This skips initial data points and finds the first non-null data point thereafter.
    // `effectiveFirstIndex` is used to determine the data type ('xy' or array) and to skip initial points for positive offset.
    let effectiveFirstIndex = 0;
    if (trendoffset > 0) {
        // Start searching for a non-null point from the offset.
        const firstNonNullAfterOffset = dataset.data.slice(trendoffset).findIndex((d) => d !== undefined && d !== null);
        if (firstNonNullAfterOffset !== -1) {
            effectiveFirstIndex = trendoffset + firstNonNullAfterOffset;
        } else {
            // All points after the offset are null or undefined, so effectively no data for trendline.
            effectiveFirstIndex = dataset.data.length; 
        }
    } else {
        // For zero or negative offset, the initial search for 'xy' type detection starts from the beginning of the dataset.
        // The actual exclusion of points for negative offset (from the end) is handled per-point within the loop.
        const firstNonNull = dataset.data.findIndex((d) => d !== undefined && d !== null);
        if (firstNonNull !== -1) {
            effectiveFirstIndex = firstNonNull;
        } else {
            // All data in the dataset is null or undefined.
            effectiveFirstIndex = dataset.data.length; 
        }
    }
    
    // Determine data structure type (object {x,y} or array of numbers) based on the first valid data point.
    // This informs how `xAxisKey` and `yAxisKey` are used or if `index` is used for x-values.
    let xy = effectiveFirstIndex < dataset.data.length && typeof dataset.data[effectiveFirstIndex] === 'object';

    // Iterate over dataset to collect points for the LineFitter.
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
        if (['time', 'timeseries'].includes(xScale.options.type) && xy) {
            // For time-based scales with object data, convert x to a numerical timestamp; ensure y is a valid number.
            let x = data[xAxisKey] != null ? data[xAxisKey] : data.t; // `data.t` is a Chart.js internal fallback for time data.
            const yValue = data[yAxisKey];

            // Both x and y must be valid for the point to be included.
            if (x != null && x !== undefined && yValue != null && !isNaN(yValue)) {
                fitter.add(new Date(x).getTime(), yValue);
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
        } else if (['time', 'timeseries'].includes(xScale.options.type) && !xy) {
            // For time-based scales with array of numbers, get the x-value from the chart labels
            const chartLabels = datasetMeta.controller.chart.data.labels;
            if (chartLabels && chartLabels[index] && data != null && !isNaN(data)) {
                const timeValue = new Date(chartLabels[index]).getTime();
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

    // --- Trendline Coordinate Calculation ---
    // Ensure there are enough points to form a trendline.
    if (fitter.count < 2) {
        return; // Not enough data points to calculate a trendline.
    }

    // These variables will hold the pixel coordinates for drawing the trendline.
    let x1_px, y1_px, x2_px, y2_px; 

    const chartArea = datasetMeta.controller.chart.chartArea; // Defines the drawable area in pixels.

    // Determine trendline start/end points based on the 'projection' option.
    if (dataset.trendlineLinear.projection) {
        const slope = fitter.slope();
        const intercept = fitter.intercept();
        let points = []; 

        if (Math.abs(slope) > 1e-6) { 
            const val_y_top = yScaleToUse.getValueForPixel(chartArea.top);
            const x_at_top = (val_y_top - intercept) / slope; 
            points.push({ x: x_at_top, y: val_y_top });

            const val_y_bottom = yScaleToUse.getValueForPixel(chartArea.bottom);
            const x_at_bottom = (val_y_bottom - intercept) / slope; 
            points.push({ x: x_at_bottom, y: val_y_bottom });
        } else { 
             points.push({ x: xScale.getValueForPixel(chartArea.left), y: intercept});
             points.push({ x: xScale.getValueForPixel(chartArea.right), y: intercept});
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
        // Ensure actualChartMinY and actualChartMaxY are correctly ordered for the filter
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
            validPoints.sort((a,b) => a.x - b.x || a.y - b.y); 

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

    // --- Line Clipping and Drawing ---
    let clippedCoords = null;
    if (isFinite(x1_px) && isFinite(y1_px) && isFinite(x2_px) && isFinite(y2_px)) {
        clippedCoords = liangBarskyClip(x1_px, y1_px, x2_px, y2_px, chartArea);
    } else {
    }

    if (clippedCoords) {
        x1_px = clippedCoords.x1;
        y1_px = clippedCoords.y1;
        x2_px = clippedCoords.x2;
        y2_px = clippedCoords.y2;

        if (Math.abs(x1_px - x2_px) < 0.5 && Math.abs(y1_px - y2_px) < 0.5) { 
        } else {
            ctx.lineWidth = lineWidth;
            setLineStyle(ctx, lineStyle);
            drawTrendline({ ctx, x1: x1_px, y1: y1_px, x2: x2_px, y2: y2_px, colorMin, colorMax });

            if (fillColor) {
                fillBelowTrendline(ctx, x1_px, y1_px, x2_px, y2_px, chartArea.bottom, fillColor);
            }

            const angle = Math.atan2(y2_px - y1_px, x2_px - x1_px);
            const displaySlope = fitter.slope();

            if (dataset.trendlineLinear.label && display !== false) {
                const trendText = displayValue
                    ? `${text} (Slope: ${
                          percentage
                              ? (displaySlope * 100).toFixed(2) + '%' 
                              : displaySlope.toFixed(2)
                      })`
                    : text;
                addTrendlineLabel(
                    ctx,
                    trendText,
                    x1_px, 
                    y1_px,
                    x2_px,
                    y2_px,
                    angle,
                    color,
                    family,
                    size,
                    offset
                );
            }
        }
    } else {
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