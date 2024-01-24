/*!
 * chartjs-plugin-trendline.js
 * Version: 2.1.1
 *
 * Copyright 2024 Marcus Alsterfjord
 * Released under the MIT license
 * https://github.com/Makanz/chartjs-plugin-trendline/blob/master/README.md
 *
 * Mod by: vesal: accept also xy-data so works with scatter
 */
import { LineFitter } from './classes/lineFitter.js';

const pluginTrendlineLinear = {
    id: 'chartjs-plugin-trendline',
    afterDatasetsDraw: (chartInstance) => {
        let yScale;
        let xScale;
        for (let axis in chartInstance.scales) {
            if (axis[0] == 'x') xScale = chartInstance.scales[axis];
            else yScale = chartInstance.scales[axis];
            if (xScale && yScale) break;
        }
        const ctx = chartInstance.ctx;

        chartInstance.data.datasets.forEach((dataset, index) => {
            const showTrendline =
                dataset.alwaysShowTrendline ||
                chartInstance.isDatasetVisible(index);

            if (
                dataset.trendlineLinear &&
                showTrendline &&
                dataset.data.length > 1
            ) {
                const datasetMeta = chartInstance.getDatasetMeta(index);
                addFitter(
                    datasetMeta,
                    ctx,
                    dataset,
                    xScale,
                    chartInstance.scales[datasetMeta.yAxisID]
                );
            }
        });

        ctx.setLineDash([]);
    },
};

const addFitter = (datasetMeta, ctx, dataset, xScale, yScale) => {
    let defaultColor = dataset.borderColor || 'rgba(169,169,169, .6)';
    let colorMin = dataset.trendlineLinear.colorMin || defaultColor;
    let colorMax = dataset.trendlineLinear.colorMax || defaultColor;
    let lineWidth = dataset.trendlineLinear.width ?? dataset.borderWidth ?? 3;
    let lineStyle = dataset.trendlineLinear.lineStyle || 'solid';
    let fillColor = dataset.trendlineLinear.fillColor;

    const chartOptions = datasetMeta.controller.chart.options;
    const parsingOptions = typeof chartOptions.parsing === 'object' ? chartOptions.parsing : undefined;
    const xAxisKey = dataset.trendlineLinear.xAxisKey || parsingOptions?.xAxisKey || 'x';
    const yAxisKey = dataset.trendlineLinear.yAxisKey || parsingOptions?.yAxisKey || 'y';

    let fitter = new LineFitter();
    let firstIndex = dataset.data.findIndex((d) => {
        return d !== undefined && d !== null;
    });
    let lastIndex = dataset.data.length - 1;
    let startPos = datasetMeta.data[firstIndex][xAxisKey];
    let endPos = datasetMeta.data[lastIndex][xAxisKey];
    let xy = typeof dataset.data[firstIndex] === 'object';

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

    let x1 = xScale.getPixelForValue(fitter.minx);
    let y1 = yScale.getPixelForValue(fitter.f(fitter.minx));

    let x2;
    let y2;

    // Project only on x axes, do not project if trendline will never hit x axes
    if (dataset.trendlineLinear.projection && fitter.scale() < 0) {
        //  X
        let x2value = fitter.fo();
        if (x2value < fitter.minx) x2value = fitter.maxx;
        x2 = xScale.getPixelForValue(x2value);

        //  Y
        y2 = yScale.getPixelForValue(fitter.f(x2value));
    } else {
        x2 = xScale.getPixelForValue(fitter.maxx);
        y2 = yScale.getPixelForValue(fitter.f(fitter.maxx));
    }

    if (!xy) {
        x1 = startPos;
        x2 = endPos;
    }

    let drawBottom = datasetMeta.controller.chart.chartArea.bottom;
    let chartWidth = datasetMeta.controller.chart.width;

    if (y1 > drawBottom) {
        // Left side is below zero
        let diff = y1 - drawBottom;
        let lineHeight = y1 - y2;
        let overlapPercentage = diff / lineHeight;
        let addition = chartWidth * overlapPercentage;

        y1 = drawBottom;
        x1 = x1 + addition;
    } else if (y2 > drawBottom) {
        // right side is below zero
        let diff = y2 - drawBottom;
        let lineHeight = y2 - y1;
        let overlapPercentage = diff / lineHeight;
        let subtraction = chartWidth - chartWidth * overlapPercentage;

        y2 = drawBottom;
        x2 = chartWidth - (x2 - subtraction);
    }

    ctx.lineWidth = lineWidth;

    if (lineStyle === 'dotted') {
        ctx.setLineDash([2, 3]); // Dotted
    } else {
        ctx.setLineDash([]); // Solid
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    let gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    if (y2 < y1) {
        gradient.addColorStop(0, colorMax);
        gradient.addColorStop(1, colorMin);
    } else {
        gradient.addColorStop(0, colorMin);
        gradient.addColorStop(1, colorMax);
    }

    ctx.strokeStyle = gradient;

    ctx.stroke();
    ctx.closePath();

    if (!!fillColor) {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, drawBottom);
        ctx.lineTo(x1, drawBottom);
        ctx.closePath();
        ctx.fill();
    }
};

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
