import { addFitter } from '../components/trendline.js';
import { getScales } from '../utils/drawing.js';
import { applyCanvasAccessibility } from '../utils/accessibility.js';

/**
 * Creates a legend item object from a dataset's trendline configuration.
 * Returns null when no legend item should be added.
 * @param {object} dataset - The chart dataset
 * @param {object} [trendlineConfig] - The trendline config (trendlineLinear or trendlineExponential)
 * @returns {object|null} Legend item object or null
 */
function createLegendItemFromTrendline(dataset, trendlineConfig) {
    if (!trendlineConfig) return null;

    const legendConfig = trendlineConfig.legend;
    if (!legendConfig || legendConfig.display === false) return null;

    return {
        text: legendConfig.text || dataset.label || 'Trendline',
        strokeStyle:
            legendConfig.strokeStyle ||
            legendConfig.color ||
            dataset.borderColor ||
            'rgba(169,169,169, .6)',
        fillStyle: legendConfig.fillStyle || 'transparent',
        lineCap: legendConfig.lineCap || 'butt',
        lineDash: legendConfig.lineDash || [],
        lineWidth: legendConfig.lineWidth ?? legendConfig.width ?? 1,
    };
}

export const pluginTrendlineLinear = {
    id: 'chartjs-plugin-trendline',

    afterDatasetsDraw: (chartInstance) => {
        const ctx = chartInstance.ctx;
        const { xScale, yScale } = getScales(chartInstance);

        const sortedDatasets = chartInstance.data.datasets
            .map((dataset, index) => ({ dataset, index }))
            .filter((entry) => entry.dataset.trendlineLinear || entry.dataset.trendlineExponential)
            .sort((a, b) => {
                const orderA = a.dataset.order ?? 0;
                const orderB = b.dataset.order ?? 0;

                // Push 0-order datasets to the end (they draw last / on top)
                if (orderA === 0 && orderB !== 0) return 1;
                if (orderB === 0 && orderA !== 0) return -1;

                // Otherwise, draw lower order first
                return orderA - orderB;
            });

        sortedDatasets.forEach(({ dataset, index }) => {
            const showTrendline =
                dataset.alwaysShowTrendline ||
                chartInstance.isDatasetVisible(index);

            if (showTrendline && dataset.data.length > 1) {
                const datasetMeta = chartInstance.getDatasetMeta(index);
                addFitter(datasetMeta, ctx, dataset, xScale, yScale);
            }
        });

        // Reset to solid line after drawing trendline
        ctx.setLineDash([]);
    },

    afterInit: (chartInstance) => {
        applyCanvasAccessibility(chartInstance);
    },

    afterUpdate: (chartInstance) => {
        applyCanvasAccessibility(chartInstance);
    },

    beforeInit: (chartInstance) => {
        const datasets = chartInstance.data.datasets;
        const hasLegendConfig = datasets.some((dataset) => {
            const trendlineConfig = dataset.trendlineLinear || dataset.trendlineExponential;
            return createLegendItemFromTrendline(dataset, trendlineConfig) !== null;
        });

        if (!hasLegendConfig) return;

        const originalGenerateLabels =
            chartInstance.legend.options.labels.generateLabels;

        chartInstance.legend.options.labels.generateLabels = function (chart) {
            const defaultLabels = originalGenerateLabels(chart);

            chart.data.datasets.forEach((dataset) => {
                const trendlineConfig = dataset.trendlineLinear || dataset.trendlineExponential;
                const item = createLegendItemFromTrendline(dataset, trendlineConfig);
                if (item) {
                    defaultLabels.push(item);
                }
            });

            return defaultLabels;
        };
    },
};
