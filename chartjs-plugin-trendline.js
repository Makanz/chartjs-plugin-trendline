/*!
 * chartjs-plugin-trendline.js
 * Version: 0.0.1
 *
 * Copyright 2017 Marcus Alsterfjord
 * Released under the MIT license
 * https://github.com/Makanz/chartjs-plugin-trendline/blob/master/README.md
 */
var pluginTrendlineLinear = {
	beforeDraw: function(chartInstance) {
		var yScale = chartInstance.scales["y-axis-0"];
		var canvas = chartInstance.chart;
		var ctx = canvas.ctx;

		if (chartInstance.options.trendlineLinear) {
			var style = chartInstance.options.trendlineLinear.style;
			var lineWidth = chartInstance.options.trendlineLinear.width;
			style = (style !== undefined) ? style : "rgba(169,169,169, .6)";
			lineWidth = (lineWidth !== undefined) ? lineWidth : 3;

			var data = chartInstance.data.datasets[0].data,
				lastIndex = data.length - 1,
				datasetMeta = chartInstance.getDatasetMeta(0),
				startPos = datasetMeta.data[0]._model.x,
				endPos = datasetMeta.data[lastIndex]._model.x,
				fitter = new LineFitter();

			for (var i = 0; i < data.length; i++) {
				fitter.add(i, data[i]);
			}

			ctx.lineWidth = lineWidth;
			ctx.beginPath();
			ctx.moveTo(startPos, yScale.getPixelForValue( fitter.project(0) ));
			ctx.lineTo(endPos, yScale.getPixelForValue( fitter.project(lastIndex) ));
			ctx.strokeStyle = style;
			ctx.stroke();
		}
	}
};
Chart.plugins.register(pluginTrendlineLinear);

function LineFitter()
{
	this.count = 0;
	this.sumX = 0;
	this.sumX2 = 0;
	this.sumXY = 0;
	this.sumY = 0;
}

LineFitter.prototype = {
	'add': function(x, y)
	{
		this.count++;
		this.sumX += x;
		this.sumX2 += x*x;
		this.sumXY += x*y;
		this.sumY += y;
	},
	'project': function(x)
	{
		var det = this.count * this.sumX2 - this.sumX * this.sumX;
		var offset = (this.sumX2 * this.sumY - this.sumX * this.sumXY) / det;
		var scale = (this.count * this.sumXY - this.sumX * this.sumY) / det;
		return offset + x * scale;
	}
};