/*!
 * chartjs-plugin-trendline.js
 * Version: 2.0.3
 *
 * Copyright 2023 Marcus Alsterfjord
 * Released under the MIT license
 * https://github.com/Makanz/chartjs-plugin-trendline/blob/master/README.md
 *
 * Mod by: vesal: accept also xy-data so works with scatter
 */
var pluginTrendlineLinear = {
    id: 'chartjs-plugin-trendline',
    afterDatasetsDraw: function (chartInstance) {
        var yScale;
        var xScale;
        for (var axis in chartInstance.scales) {
            if (axis[0] == 'x') xScale = chartInstance.scales[axis];
            else yScale = chartInstance.scales[axis];
            if (xScale && yScale) break;
        }
        var ctx = chartInstance.ctx;

        chartInstance.data.datasets.forEach(function (dataset, index) {
            var showTrendline =
                dataset.alwaysShowTrendline ||
                chartInstance.isDatasetVisible(index);

            if (
                dataset.trendlineLinear &&
                showTrendline &&
                dataset.data.length > 1
            ) {
                var datasetMeta = chartInstance.getDatasetMeta(index);
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

function addFitter(datasetMeta, ctx, dataset, xScale, yScale) {
    var defaultColor = dataset.borderColor || 'rgba(169,169,169, .6)';
    var colorMin = dataset.trendlineLinear.colorMin || defaultColor;
    var colorMax = dataset.trendlineLinear.colorMax || defaultColor;
    var lineWidth = dataset.trendlineLinear.width || dataset.borderWidth;
    var lineStyle = dataset.trendlineLinear.lineStyle || 'solid';
    var fillColor = dataset.trendlineLinear.fillColor;

    lineWidth = lineWidth !== undefined ? lineWidth : 3;

    var fitter = new LineFitter();
    var firstIndex = dataset.data.findIndex((d) => {
        return d !== undefined && d !== null;
    });
    var lastIndex = dataset.data.length - 1;
    var startPos = datasetMeta.data[firstIndex].x;
    var endPos = datasetMeta.data[lastIndex].x;
    var xy = typeof dataset.data[firstIndex] === 'object';

    dataset.data.forEach(function (data, index) {
        if (data == null) return;

        if (['time', 'timeseries'].includes(xScale.options.type)) {
            var x = data.x != null ? data.x : data.t;
            fitter.add(new Date(x).getTime(), data.y);
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

    var x1 = xScale.getPixelForValue(fitter.minx);
    var y1 = yScale.getPixelForValue(fitter.f(fitter.minx));

    var x2;
    var y2;

    // Project only on x axes, do not project if trendline will never hit x axes
    if (dataset.trendlineLinear.projection && fitter.scale() < 0) {
        //  X
        var x2value = fitter.fo();
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

    var drawBottom = datasetMeta.controller.chart.chartArea.bottom;
    var chartWidth = datasetMeta.controller.chart.width;

    if (y1 > drawBottom) {
        // Left side is below zero
        var diff = y1 - drawBottom;
        var lineHeight = y1 - y2;
        var overlapPercentage = diff / lineHeight;
        var addition = chartWidth * overlapPercentage;

        y1 = drawBottom;
        x1 = x1 + addition;
    } else if (y2 > drawBottom) {
        // right side is below zero
        var diff = y2 - drawBottom;
        var lineHeight = y2 - y1;
        var overlapPercentage = diff / lineHeight;
        var subtraction = chartWidth - chartWidth * overlapPercentage;

        y2 = drawBottom;
        x2 = chartWidth - (x2 - subtraction);
    }

    ctx.lineWidth = lineWidth;
    if (lineStyle === 'dotted') {
        ctx.setLineDash([2, 3]);
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    var gradient = ctx.createLinearGradient(x1, y1, x2, y2);
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
}

function LineFitter() {
    this.count = 0;
    this.sumX = 0;
    this.sumX2 = 0;
    this.sumXY = 0;
    this.sumY = 0;
    this.minx = 1e100;
    this.maxx = -1e100;
    this.maxy = -1e100;
}

LineFitter.prototype = {
    add: function (x, y) {
        x = parseFloat(x);
        y = parseFloat(y);

        this.count++;
        this.sumX += x;
        this.sumX2 += x * x;
        this.sumXY += x * y;
        this.sumY += y;
        if (x < this.minx) this.minx = x;
        if (x > this.maxx) this.maxx = x;
        if (y > this.maxy) this.maxy = y;
    },
    f: function (x) {
        x = parseFloat(x);

        var det = this.count * this.sumX2 - this.sumX * this.sumX;
        var offset = (this.sumX2 * this.sumY - this.sumX * this.sumXY) / det;
        var scale = (this.count * this.sumXY - this.sumX * this.sumY) / det;
        return offset + x * scale;
    },
    fo: function () {
        var det = this.count * this.sumX2 - this.sumX * this.sumX;
        var offset = (this.sumX2 * this.sumY - this.sumX * this.sumXY) / det;
        var scale = (this.count * this.sumXY - this.sumX * this.sumY) / det;

        //  Get x when y = 0
        var xo = -offset / scale;
        return xo;
    },
    scale: function () {
        var det = this.count * this.sumX2 - this.sumX * this.sumX;
        var scale = (this.count * this.sumXY - this.sumX * this.sumY) / det;

        return scale;
    },
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
