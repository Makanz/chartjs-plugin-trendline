# chartjs-plugin-trendline

This plugin draws an linear trendline in your Chart. Made for Chart.js > 2.0

## Installation

#### Load directly in the browser

Load ChartJS first, then the plugin which will automatically register itself with ChartJS

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js/dist/Chart.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-trendline"></script>
```

#### As a Chart.JS plugin

Install & import the plugin via npm:

`npm i chart.js chartjs-plugin-trendline`

```js
import ChartJS from "chart.js";
import chartTrendline from "chartjs-plugin-trendline";

ChartJS.plugins.register(chartTrendline);
```

## Configuration

To configure the trendline plugin you simply add a new config options to your dataset in your chart config.

```javascript
{
	trendlineLinear: {
		style: "rgba(255,105,180, .8)",
		lineStyle: "dotted|solid",
		width: 2
	}
}
```

## Supported chart types

-   bar
-   line

## Contributing

Pull requests and issues are always welcome.
For bugs and feature requests, [please create an issue](https://github.com/Makanz/chartjs-plugin-trendline/issues).

## License

chartjs-plugin-trendline.js is available under the [MIT license](http://opensource.org/licenses/MIT).
