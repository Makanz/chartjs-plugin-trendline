# chartjs-plugin-trendline

This plugin draws linear and exponential trendlines in your Chart.
It has been tested with Chart.js version 4.4.9.

## 📊 [View Live Examples](https://makanz.github.io/chartjs-plugin-trendline/)

See the plugin in action with interactive examples for different chart types.

## Installation

#### Load directly in the browser

Load Chart.js first, then the plugin which will automatically register itself with Chart.js

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-trendline/dist/chartjs-plugin-trendline.min.js"></script>
```

#### As a Chart.JS plugin

Install & import the plugin via npm:

`npm i chart.js chartjs-plugin-trendline`

```js
import ChartJS from 'chart.js';
import chartTrendline from 'chartjs-plugin-trendline';

ChartJS.plugins.register(chartTrendline);
```

## Configuration

To configure the trendline plugin you simply add a new config options to your dataset in your chart config.

### Linear Trendlines

For linear trendlines (straight lines), use the `trendlineLinear` configuration:

```javascript
{
	trendlineLinear: {
		colorMin: Color,
		colorMax: Color,
		lineStyle: string, // "dotted" | "solid" | "dashed" | "dashdot"
		width: number,
		xAxisKey: string, // optional
		yAxisKey: string, // optional
		projection: boolean, // optional
		trendoffset: number, // optional, if > 0 skips first n elements, if < 0 uses last n elements
		// optional
		label: {
			color: Color,
			text: string,
			display: boolean,
			displayValue: boolean, // shows slope value
			offset: number,
			percentage: boolean,
			font: {
				family: string,
				size: number,
			}
		},
		// optional
		legend: {
			text: string,
			strokeStyle: Color,
			fillStyle: Color,
			lineCap: string,
			lineDash: number[],
			lineWidth: number,
		}
	}
}
```

### Exponential Trendlines

For exponential trendlines (curves of the form y = a × e^(b×x)), use the `trendlineExponential` configuration:

```javascript
{
	trendlineExponential: {
		colorMin: Color,
		colorMax: Color,
		lineStyle: string, // "dotted" | "solid" | "dashed" | "dashdot"
		width: number,
		xAxisKey: string, // optional
		yAxisKey: string, // optional
		projection: boolean, // optional
		trendoffset: number, // optional, if > 0 skips first n elements, if < 0 uses last n elements
		// optional
		label: {
			color: Color,
			text: string,
			display: boolean,
			displayValue: boolean, // shows exponential parameters (a, b)
			offset: number,
			font: {
				family: string,
				size: number,
			}
		},
		// optional
		legend: {
			text: string,
			strokeStyle: Color,
			fillStyle: Color,
			lineCap: string,
			lineDash: number[],
			lineWidth: number,
		}
	}
}
```

**Note:** Exponential trendlines work best with positive y-values. The equation fitted is y = a × e^(b×x), where:
- `a` is the coefficient (scaling factor)
- `b` is the growth rate (positive for growth, negative for decay)

## Examples

- [Linear Trendline Example](./example/lineChart.html)
- [Exponential Trendline Example](./example/exponentialChart.html)
- [Bar Chart with Trendline](./example/barChart.html)
- [Scatter Chart with Trendline](./example/scatterChart.html)

## Supported chart types

-   bar
-   line
-   scatter

Both linear and exponential trendlines are supported for all chart types.

## Contributing

Pull requests and issues are always welcome.
For bugs and feature requests, [please create an issue](https://github.com/Makanz/chartjs-plugin-trendline/issues).

## License

chartjs-plugin-trendline.js is available under the [MIT license](http://opensource.org/licenses/MIT).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Makanz/chartjs-plugin-trendline&type=Date)](https://star-history.com/#Makanz/chartjs-plugin-trendline&Date)
