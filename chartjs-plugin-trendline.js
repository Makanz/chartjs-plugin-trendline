/*!
 * chartjs-plugin-trendline.js
 * Version: 0.0.1
 *
 * Copyright 2017 Marcus Alsterfjord
 * Released under the MIT license
 * https://github.com/Makanz/chartjs-plugin-trendline/blob/master/README.md
 */
var pluginTrendlineLinear = {
    beforeDraw: function (chartInstance) {

        var yScale = chartInstance.scales["y-axis-0"],
            canvas = chartInstance.chart,
            ctx = canvas.ctx;        

        for (var i = 0; i < chartInstance.data.datasets.length; i++) {
            
            if (chartInstance.data.datasets[i].trendlineLinear) {                                               
                var datasets = chartInstance.data.datasets[i],
                    datasetMeta = chartInstance.getDatasetMeta(i);                                                     

                addFitter(datasetMeta, ctx, datasets, yScale);
            }
        }
    }
};

function addFitter(datasetMeta, ctx, datasets, yScale) {
    
    var style = datasets.trendlineLinear.style;
        style = (style !== undefined) ? style : "rgba(169,169,169, .6)";    
    var lineWidth = datasets.trendlineLinear.width;
        lineWidth = (lineWidth !== undefined) ? lineWidth : 3;

    var lastIndex = datasets.data.length - 1,
        startPos = datasetMeta.data[0]._model.x,
        endPos = datasetMeta.data[lastIndex]._model.x,
        fitter = new LineFitter();

    for (var i = 0; i < datasets.data.length; i++) {
        fitter.add(i, datasets.data[i]);
    }

    ctx.lineWidth = lineWidth;
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
