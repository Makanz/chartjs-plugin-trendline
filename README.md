# chartjs-plugin-trendline

This plugin draws an linear trendline in your Chart.
It has been tested with Chart.js version 4.4.4.

## Installation

#### Load directly in the browser

Load Chart.js first, then the plugin which will automatically register itself with Chart.js

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.min.js"></script>
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
		// optional
		label: {
			color: Color,
			text: string,
			display: boolean,
			displayValue: boolean,
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

## Supported chart types

-   bar
-   line
-   scatter

## Contributing

Pull requests and issues are always welcome.
For bugs and feature requests, [please create an issue](https://github.com/Makanz/chartjs-plugin-trendline/issues).

## License

chartjs-plugin-trendline.js is available under the [MIT license](http://opensource.org/licenses/MIT).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Makanz/chartjs-plugin-trendline&type=Date)](https://star-history.com/#Makanz/chartjs-plugin-trendline&Date)
