import { addFitter } from '../components/trendline';
import { getScales } from '../utils/drawing';
import { ExponentialFitter, LogarithmicFitter } from '../utils/lineFitter';

export const pluginTrendlineLinear = {
    id: 'chartjs-plugin-trendline',

    afterDatasetsDraw: (chartInstance) => {
        const ctx = chartInstance.ctx;
        const { xScale, yScale } = getScales(chartInstance);

        chartInstance.data.datasets.forEach((dataset, index) => {
            const showTrendline =
                dataset.alwaysShowTrendline ||
                chartInstance.isDatasetVisible(index);

            if (!showTrendline || dataset.data.length <= 1) return;

            const datasetMeta = chartInstance.getDatasetMeta(index);

            try {
                if (dataset.trendlineLinear) {
                    addFitter(
                        datasetMeta,
                        ctx,
                        dataset,
                        xScale,
                        yScale,
                        LineFitter
                    );
                }
                if (dataset.trendlineExponential) {
                    addFitter(
                        datasetMeta,
                        ctx,
                        dataset,
                        xScale,
                        yScale,
                        ExponentialFitter
                    );
                }
                if (dataset.trendlineLogarithmic) {
                    addFitter(
                        datasetMeta,
                        ctx,
                        dataset,
                        xScale,
                        yScale,
                        LogarithmicFitter
                    );
                }
            } catch (error) {
                console.warn(
                    `Failed to draw trendline for dataset ${index}:`,
                    error
                );
            }
        });

        // Reset to solid line after drawing trendline
        ctx.setLineDash([]);
    },

    beforeInit: (chartInstance) => {
        const datasets = chartInstance.data.datasets;

        datasets.forEach((dataset) => {
            const updateLegend = (trendlineType, config) => {
                if (!config?.label) return;

                const label = config.label;
                const originalGenerateLabels =
                    chartInstance.legend.options.labels.generateLabels;

                chartInstance.legend.options.labels.generateLabels = function (
                    chart
                ) {
                    const defaultLabels = originalGenerateLabels(chart);
                    const legendConfig = config.legend;

                    // Display the legend if it's populated and not set to hidden
                    if (legendConfig && legendConfig.display !== false) {
                        defaultLabels.push({
                            text:
                                legendConfig.text ||
                                `${label} (${trendlineType} Trendline)`,
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
            };

            if (dataset.trendlineLinear) {
                updateLegend('Linear', dataset.trendlineLinear);
            }
            if (dataset.trendlineExponential) {
                updateLegend('Exponential', dataset.trendlineExponential);
            }
            if (dataset.trendlineLogarithmic) {
                updateLegend('Logarithmic', dataset.trendlineLogarithmic);
            }
        });
    },
};
