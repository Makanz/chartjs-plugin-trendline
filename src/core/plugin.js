import { addFitter } from '../components/trendline';
import { getScales } from '../utils/drawing';

export const pluginTrendlineLinear = {
    id: 'chartjs-plugin-trendline',

    afterDatasetsDraw: (chartInstance) => {
        const ctx = chartInstance.ctx;
        const { xScale, yScale } = getScales(chartInstance);

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
                addFitter(datasetMeta, ctx, dataset, xScale, yScale);
            }
        });

        // Reset to solid line after drawing trendline
        ctx.setLineDash([]);
    },

    beforeInit: (chartInstance) => {
        const datasets = chartInstance.data.datasets;

        datasets.forEach((dataset) => {
            if (dataset.trendlineLinear && dataset.trendlineLinear.label) {
                const label = dataset.trendlineLinear.label;

                // Access chartInstance to update legend labels
                const originalGenerateLabels =
                    chartInstance.legend.options.labels.generateLabels;

                chartInstance.legend.options.labels.generateLabels = function (
                    chart
                ) {
                    const defaultLabels = originalGenerateLabels(chart);

                    const legendConfig = dataset.trendlineLinear.legend;

                    // Display the legend is it's populated and not set to hidden
                    if (legendConfig && legendConfig.display !== false) {
                        defaultLabels.push({
                            text: legendConfig.text || label + ' (Trendline)',
                            strokeStyle:
                                legendConfig.color ||
                                dataset.borderColor ||
                                'rgba(169,169,169, .6)',
                            fillStyle: legendConfig.fillStyle || 'transparent',
                            lineCap: legendConfig.lineCap || 'butt',
                            lineDash: legendConfig.lineDash || [],
                            lineWidth: legendConfig.width || 1,
                        });
                    }
                    return defaultLabels;
                };
            }
        });
    },
}; 