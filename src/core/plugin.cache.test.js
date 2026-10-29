import 'jest-canvas-mock';
import { pluginTrendlineLinear } from './plugin.js';
import { LineFitter } from '../utils/lineFitter.js';

// Count how often the regression is actually built, while still using the real
// LineFitter implementation underneath.
jest.mock('../utils/lineFitter.js', () => {
    const actual = jest.requireActual('../utils/lineFitter.js');
    return {
        LineFitter: jest.fn(function LineFitterSpy(...args) {
            return new actual.LineFitter(...args);
        }),
    };
});

/**
 * The draw hook runs on every animation frame. Without caching, the O(points)
 * regression is refitted ~60 times per second during a 1 s animation. These
 * tests pin the caching contract: one fit per chart.update(), plus cache
 * invalidation on data/config changes.
 */
describe('pluginTrendlineLinear - per-update fit cache', () => {
    const datasets = () => [
        {
            label: 'series',
            data: [1, 3, 2, 5, 4],
            borderColor: 'blue',
            trendlineLinear: {},
        },
    ];

    const createChart = (data) => {
        const ctx = document.createElement('canvas').getContext('2d');
        const chart = {
            ctx,
            data: { datasets: data, labels: [] },
            options: {},
            chartArea: { left: 40, right: 460, top: 10, bottom: 290, width: 420, height: 280 },
            scales: {
                x: {
                    id: 'x',
                    isHorizontal: () => true,
                    getPixelForValue: (value) => 40 + value * 42,
                    getValueForPixel: (pixel) => (pixel - 40) / 42,
                    options: { type: 'linear' },
                },
                y: {
                    id: 'y',
                    isHorizontal: () => false,
                    getPixelForValue: (value) => 290 - value * 2.8,
                    getValueForPixel: (pixel) => (290 - pixel) / 2.8,
                    options: {},
                },
            },
            isDatasetVisible: () => true,
            getDatasetMeta: (index) => ({ index, controller: { chart } }),
        };
        return chart;
    };

    beforeEach(() => {
        LineFitter.mockClear();
    });

    it('fits once and reuses the result on the following animation frames', () => {
        const chart = createChart(datasets());

        pluginTrendlineLinear.afterDatasetsDraw(chart);
        pluginTrendlineLinear.afterDatasetsDraw(chart);
        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(LineFitter).toHaveBeenCalledTimes(1);
    });

    it('refits after beforeUpdate (new data, scales or options)', () => {
        const chart = createChart(datasets());

        pluginTrendlineLinear.afterDatasetsDraw(chart);
        pluginTrendlineLinear.beforeUpdate(chart);
        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(LineFitter).toHaveBeenCalledTimes(2);
    });

    it('refits when the data array is replaced', () => {
        const chart = createChart(datasets());

        pluginTrendlineLinear.afterDatasetsDraw(chart);
        chart.data.datasets[0].data = [2, 4, 6, 8];
        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(LineFitter).toHaveBeenCalledTimes(2);
    });

    it('refits when the data array grows in place', () => {
        const chart = createChart(datasets());

        pluginTrendlineLinear.afterDatasetsDraw(chart);
        chart.data.datasets[0].data.push(9);
        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(LineFitter).toHaveBeenCalledTimes(2);
    });

    it('refits when the trendline offset changes', () => {
        const chart = createChart(datasets());

        pluginTrendlineLinear.afterDatasetsDraw(chart);
        chart.data.datasets[0].trendlineLinear.trendoffset = 2;
        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(LineFitter).toHaveBeenCalledTimes(2);
    });

    it('refits after beforeDestroy', () => {
        const chart = createChart(datasets());

        pluginTrendlineLinear.afterDatasetsDraw(chart);
        pluginTrendlineLinear.beforeDestroy(chart);
        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(LineFitter).toHaveBeenCalledTimes(2);
    });

    it('keeps separate caches per chart', () => {
        const first = createChart(datasets());
        const second = createChart(datasets());

        pluginTrendlineLinear.afterDatasetsDraw(first);
        pluginTrendlineLinear.afterDatasetsDraw(second);

        expect(LineFitter).toHaveBeenCalledTimes(2);
    });

    it('skips a trendline that collapses to a single point', () => {
        const chart = createChart([
            {
                label: 'same-x',
                data: [
                    { x: 1, y: 10 },
                    { x: 1, y: 20 },
                    { x: 1, y: 30 },
                ],
                borderColor: 'blue',
                trendlineLinear: {},
            },
        ]);
        const stroke = jest.spyOn(chart.ctx, 'stroke');

        expect(() => pluginTrendlineLinear.afterDatasetsDraw(chart)).not.toThrow();
        expect(stroke).not.toHaveBeenCalled();
    });

    it('keeps drawing the other datasets when one has a vertical series', () => {
        const chart = createChart([
            {
                label: 'same-x',
                data: [
                    { x: 1, y: 10 },
                    { x: 1, y: 30 },
                ],
                borderColor: 'blue',
                trendlineLinear: {},
            },
            {
                label: 'normal',
                data: [
                    { x: 1, y: 10 },
                    { x: 2, y: 20 },
                    { x: 3, y: 42 },
                ],
                borderColor: 'red',
                trendlineLinear: {},
            },
        ]);
        const stroke = jest.spyOn(chart.ctx, 'stroke');

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        // Regression bug: NaN from the vertical series must not swallow the
        // trendline of the healthy dataset.
        expect(stroke).toHaveBeenCalled();
    });
});
