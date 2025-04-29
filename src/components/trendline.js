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