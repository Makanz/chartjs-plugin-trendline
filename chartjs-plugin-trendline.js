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