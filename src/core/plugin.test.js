import { pluginTrendlineLinear } from './plugin.js';

describe('pluginTrendlineLinear.beforeInit - legend generation', () => {
    let chartInstance;
    let originalGenerateLabels;

    beforeEach(() => {
        originalGenerateLabels = jest.fn(() => [{ text: 'Dataset 1' }]);
        chartInstance = {
            data: { datasets: [] },
            legend: {
                options: {
                    labels: {
                        generateLabels: originalGenerateLabels,
                    },
                },
            },
        };
    });

    /**
     * Bug 1: Legend item must appear even when trendlineConfig.label is absent,
     * as long as trendlineConfig.legend is configured.
     */
    it('adds a legend item when only trendlineConfig.legend is present (no label key)', () => {
        chartInstance.data.datasets = [
            {
                label: 'My Dataset',
                borderColor: '#2196F3',
                trendlineLinear: {
                    // No `label` key - this was the bug trigger
                    legend: {
                        text: 'Trend',
                        strokeStyle: '#ff6b6b',
                    },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Trend');
        expect(trendlineLabel).toBeDefined();
    });

    it('does not add a legend item when neither label nor legend key is present', () => {
        chartInstance.data.datasets = [
            {
                label: 'My Dataset',
                trendlineLinear: {
                    colorMin: 'red',
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        // generateLabels should not have been replaced
        expect(chartInstance.legend.options.labels.generateLabels).toBe(originalGenerateLabels);
    });

    it('still adds a legend item when only trendlineConfig.label is present (backwards compat)', () => {
        chartInstance.data.datasets = [
            {
                label: 'My Dataset',
                trendlineLinear: {
                    label: { display: false },
                    legend: { text: 'Trend' },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        expect(labels.some((l) => l.text === 'Trend')).toBe(true);
    });

    /**
     * Bug 2: legendConfig.strokeStyle should be respected.
     */
    it('uses legendConfig.strokeStyle for the legend item strokeStyle', () => {
        chartInstance.data.datasets = [
            {
                borderColor: '#2196F3',
                trendlineLinear: {
                    legend: {
                        text: 'Trend',
                        strokeStyle: '#ff6b6b',
                    },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Trend');
        expect(trendlineLabel.strokeStyle).toBe('#ff6b6b');
    });

    it('falls back to legendConfig.color for strokeStyle when strokeStyle is absent', () => {
        chartInstance.data.datasets = [
            {
                borderColor: '#2196F3',
                trendlineLinear: {
                    legend: {
                        text: 'Trend',
                        color: '#aabbcc',
                    },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Trend');
        expect(trendlineLabel.strokeStyle).toBe('#aabbcc');
    });

    it('falls back to dataset.borderColor for strokeStyle when neither strokeStyle nor color is set', () => {
        chartInstance.data.datasets = [
            {
                borderColor: '#2196F3',
                trendlineLinear: {
                    legend: { text: 'Trend' },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Trend');
        expect(trendlineLabel.strokeStyle).toBe('#2196F3');
    });

    it('falls back to default gray strokeStyle when no color source is available', () => {
        chartInstance.data.datasets = [
            {
                trendlineLinear: {
                    legend: { text: 'Trend' },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Trend');
        expect(trendlineLabel.strokeStyle).toBe('rgba(169,169,169, .6)');
    });

    /**
     * Bug 3: legendConfig.lineWidth should control the legend item line width.
     */
    it('uses legendConfig.lineWidth for the legend item lineWidth', () => {
        chartInstance.data.datasets = [
            {
                trendlineLinear: {
                    legend: {
                        text: 'Trend',
                        lineWidth: 3,
                    },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Trend');
        expect(trendlineLabel.lineWidth).toBe(3);
    });

    it('allows legendConfig.lineWidth of 0 to hide the legend border', () => {
        chartInstance.data.datasets = [
            {
                trendlineLinear: {
                    legend: {
                        text: 'Trend',
                        lineWidth: 0,
                    },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Trend');
        expect(trendlineLabel.lineWidth).toBe(0);
    });

    it('falls back to legendConfig.width for lineWidth when lineWidth is absent', () => {
        chartInstance.data.datasets = [
            {
                trendlineLinear: {
                    legend: {
                        text: 'Trend',
                        width: 2,
                    },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Trend');
        expect(trendlineLabel.lineWidth).toBe(2);
    });

    it('defaults lineWidth to 1 when neither lineWidth nor width is set', () => {
        chartInstance.data.datasets = [
            {
                trendlineLinear: {
                    legend: { text: 'Trend' },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Trend');
        expect(trendlineLabel.lineWidth).toBe(1);
    });

    /**
     * Legend text fallback behaviour.
     */
    it('uses dataset.label as text fallback when legendConfig.text is absent', () => {
        chartInstance.data.datasets = [
            {
                label: 'Balance',
                trendlineLinear: {
                    legend: { strokeStyle: '#ff0000' },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Balance');
        expect(trendlineLabel).toBeDefined();
    });

    it('falls back to "Trendline" text when neither legendConfig.text nor dataset.label is set', () => {
        chartInstance.data.datasets = [
            {
                trendlineLinear: {
                    legend: { strokeStyle: '#ff0000' },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Trendline');
        expect(trendlineLabel).toBeDefined();
    });

    it('does not add legend item when legendConfig.display is false', () => {
        chartInstance.data.datasets = [
            {
                label: 'My Dataset',
                trendlineLinear: {
                    legend: { text: 'Trend', display: false },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        expect(labels.some((l) => l.text === 'Trend')).toBe(false);
    });

    it('works with trendlineExponential config', () => {
        chartInstance.data.datasets = [
            {
                label: 'Exp Dataset',
                borderColor: '#00ff00',
                trendlineExponential: {
                    legend: {
                        text: 'Exp Trend',
                        strokeStyle: '#ff0000',
                        lineWidth: 2,
                    },
                },
            },
        ];

        pluginTrendlineLinear.beforeInit(chartInstance);

        const labels = chartInstance.legend.options.labels.generateLabels(chartInstance);
        const trendlineLabel = labels.find((l) => l.text === 'Exp Trend');
        expect(trendlineLabel).toBeDefined();
        expect(trendlineLabel.strokeStyle).toBe('#ff0000');
        expect(trendlineLabel.lineWidth).toBe(2);
    });
});
