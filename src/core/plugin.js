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

/**
 * Per chart caches, valid for one chart.update(): the draw hook runs on every
 * animation frame, so neither the regression fit nor the dataset ordering
 * should be recomputed per frame. `beforeUpdate` throws the cache away.
 * @type {WeakMap<Chart, {fits: Map, sortedDatasets: Array|null}>}
 */
const chartCaches = new WeakMap();

const getChartCache = (chartInstance) => {
    let cache = chartCaches.get(chartInstance);
    if (!cache) {
        cache = { fits: new Map(), sortedDatasets: null };
        chartCaches.set(chartInstance, cache);
    }
    return cache;
};

const resetChartCache = (chartInstance) => {
    chartCaches.delete(chartInstance);
};

/**
 * Returns the trendline datasets in drawing order.
 * @param {Array} datasets - chart.data.datasets
 * @returns {Array<{dataset: object, index: number}>} Sorted entries
 */
const sortTrendlineDatasets = (datasets) =>
    datasets
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

export const pluginTrendlineLinear = {
    id: 'chartjs-plugin-trendline',

    afterDatasetsDraw: (chartInstance) => {
        const ctx = chartInstance.ctx;
        const { xScale, yScale } = getScales(chartInstance);
        const cache = getChartCache(chartInstance);

        // Ordering is stable between updates, so it is computed once per update
        // instead of on every animation frame.
        if (!cache.sortedDatasets) {
            cache.sortedDatasets = sortTrendlineDatasets(chartInstance.data.datasets);
        }

        cache.sortedDatasets.forEach(({ dataset, index }) => {
            const showTrendline =
                dataset.alwaysShowTrendline ||
                chartInstance.isDatasetVisible(index);

            if (!showTrendline || dataset.data.length <= 1) return;

            const datasetMeta = chartInstance.getDatasetMeta(index);

            // Bound datasets to their own x axis: with more than one horizontal
            // scale, getScales() only returns a single (arbitrary) one.
            const datasetXScale =
                chartInstance.scales?.[dataset.xAxisID || 'x'] || xScale;

            addFitter(datasetMeta, ctx, dataset, datasetXScale, yScale, cache.fits);
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

    beforeUpdate: (chartInstance) => {
        // New data, scales or options: drop the cached fit and ordering.
        resetChartCache(chartInstance);
    },

    beforeDestroy: (chartInstance) => {
        resetChartCache(chartInstance);
    },

    beforeInit: (chartInstance) => {
        const datasets = chartInstance.data.datasets;
        const hasLegendConfig = datasets.some((dataset) => {
            const trendlineConfig = dataset.trendlineLinear || dataset.trendlineExponential;
            return createLegendItemFromTrendline(dataset, trendlineConfig) !== null;
        });

        if (!hasLegendConfig) return;

        // The legend plugin may be disabled (plugins.legend.display: false), in
        // which case chart.legend is undefined.
        const legendLabels = chartInstance.legend?.options?.labels;
        if (!legendLabels) return;

        const originalGenerateLabels = legendLabels.generateLabels;

        legendLabels.generateLabels = function (chart) {
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
