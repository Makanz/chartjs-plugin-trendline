/*!
 * chartjs-plugin-trendline.js
 * Version: 0.1.1
 *
 * Copyright 2017 Marcus Alsterfjord
 * Released under the MIT license
 * https://github.com/Makanz/chartjs-plugin-trendline/blob/master/README.md
 */
var pluginTrendlineLinear = {
    beforeDraw: function(chartInstance) {
        var yScale = chartInstance.scales["y-axis-0"];
        var ctx = chartInstance.chart.ctx;

        chartInstance.data.datasets.forEach(function(dataset, index) {
            if (dataset.trendlineLinear && chartInstance.isDatasetVisible(index)) {
                var datasetMeta = chartInstance.getDatasetMeta(index);
                addFitter(datasetMeta, ctx, dataset, yScale);
            }
        });

        ctx.setLineDash([]);
    }
};

function addFitter(datasetMeta, ctx, dataset, yScale) {
    var style = dataset.trendlineLinear.style || dataset.borderColor;
    var lineWidth = dataset.trendlineLinear.width || dataset.borderWidth;
    var lineStyle = dataset.trendlineLinear.lineStyle || "solid";

    style = (style !== undefined) ? style : "rgba(169,169,169, .6)";
    lineWidth = (lineWidth !== undefined) ? lineWidth : 3;

    var lastIndex = dataset.data.length - 1;
    var startPos = datasetMeta.data[0]._model.x;
    var endPos = datasetMeta.data[lastIndex]._model.x;
    var fitter = new LineFitter();

    dataset.data.forEach(function(data, index) {
        fitter.add(index, data);
    });

    ctx.lineWidth = lineWidth;
    if (lineStyle === "dotted") {
        ctx.setLineDash([2, 3]);
    }
    ctx.beginPath();
    ctx.moveTo(startPos, yScale.getPixelForValue(fitter.project(0)));
    ctx.lineTo(endPos, yScale.getPixelForValue(fitter.project(lastIndex)));
    ctx.strokeStyle = style;
    ctx.stroke();
}

Chart.plugins.register(pluginTrendlineLinear);

function LineFitter() {
    this.count = 0;
    this.sumX = 0;
    this.sumX2 = 0;
    this.sumXY = 0;
    this.sumY = 0;
}

LineFitter.prototype = {
    'add': function (x, y) {
        this.count++;
        this.sumX += x;
        this.sumX2 += x * x;
        this.sumXY += x * y;
        this.sumY += y;
    },
    'project': function (x) {
        var det = this.count * this.sumX2 - this.sumX * this.sumX;
        var offset = (this.sumX2 * this.sumY - this.sumX * this.sumXY) / det;
        var scale = (this.count * this.sumXY - this.sumX * this.sumY) / det;
        return offset + x * scale;
    }
};
