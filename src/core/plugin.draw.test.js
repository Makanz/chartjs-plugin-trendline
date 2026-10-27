import { pluginTrendlineLinear } from './plugin.js';
import { addFitter } from '../components/trendline.js';

jest.mock('../components/trendline.js', () => ({ addFitter: jest.fn() }));

/**
 * Characterization tests for pluginTrendlineLinear.afterDatasetsDraw.
 *
 * Before these tests existed the whole draw hook (plugin.js:35-67) was
 * uncovered (coverage reported 54.76% for core/plugin.js). The hook is the
 * hot path — it runs on every animation frame — so it needs a safety net
 * before any performance work touches it.
 *
 * addFitter is mocked here: its own math is covered by trendline.test.js.
 * These tests only pin the wiring (selection, ordering, visibility, ctx).
 */
describe('pluginTrendlineLinear.afterDatasetsDraw', () => {
    let ctx;

    const createChart = ({ datasets, visible = () => true, scales } = {}) => ({
        ctx,
        data: { datasets },
        scales: scales || {
            x: { id: 'x', isHorizontal: () => true },
            y: { id: 'y', isHorizontal: () => false },
        },
        isDatasetVisible: jest.fn(visible),
        getDatasetMeta: jest.fn((index) => ({ datasetIndex: index })),
    });

    beforeEach(() => {
        jest.clearAllMocks();
        ctx = { setLineDash: jest.fn() };
    });

    it('draws a trendline for every dataset that has a trendline config', () => {
        const chart = createChart({
            datasets: [
                { label: 'a', data: [1, 2, 3], trendlineLinear: {} },
                { label: 'b', data: [1, 2, 3] },
                { label: 'c', data: [3, 2, 1], trendlineExponential: {} },
            ],
        });

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(addFitter).toHaveBeenCalledTimes(2);
        expect(addFitter.mock.calls[0][2]).toBe(chart.data.datasets[0]);
        expect(addFitter.mock.calls[1][2]).toBe(chart.data.datasets[2]);
    });

    it('passes the dataset meta, canvas context and both scales to addFitter', () => {
        const dataset = { label: 'a', data: [1, 2, 3], trendlineLinear: {} };
        const chart = createChart({ datasets: [dataset] });

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        const [meta, passedCtx, passedDataset, passedX, passedY] = addFitter.mock.calls[0];
        expect(meta).toEqual({ datasetIndex: 0 });
        expect(passedCtx).toBe(ctx);
        expect(passedDataset).toBe(dataset);
        expect(passedX).toBe(chart.scales.x);
        expect(passedY).toBe(chart.scales.y);
    });

    it('skips datasets without a trendline config', () => {
        const chart = createChart({
            datasets: [{ label: 'plain', data: [1, 2, 3] }],
        });

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(addFitter).not.toHaveBeenCalled();
    });

    it('skips datasets that are hidden', () => {
        const chart = createChart({
            datasets: [{ label: 'a', data: [1, 2, 3], trendlineLinear: {} }],
            visible: () => false,
        });

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(chart.isDatasetVisible).toHaveBeenCalledWith(0);
        expect(addFitter).not.toHaveBeenCalled();
    });

    it('draws hidden datasets when alwaysShowTrendline is set', () => {
        const chart = createChart({
            datasets: [
                { label: 'a', data: [1, 2, 3], trendlineLinear: {}, alwaysShowTrendline: true },
            ],
            visible: () => false,
        });

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(addFitter).toHaveBeenCalledTimes(1);
        // short-circuited: isDatasetVisible must not be consulted
        expect(chart.isDatasetVisible).not.toHaveBeenCalled();
    });

    it('skips datasets with fewer than two data points', () => {
        const chart = createChart({
            datasets: [
                { label: 'empty', data: [], trendlineLinear: {} },
                { label: 'single', data: [1], trendlineLinear: {} },
            ],
        });

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(addFitter).not.toHaveBeenCalled();
    });

    it('draws dataset order 0 last so it ends up on top', () => {
        const chart = createChart({
            datasets: [
                { label: 'zero', data: [1, 2], order: 0, trendlineLinear: {} },
                { label: 'two', data: [1, 2], order: 2, trendlineLinear: {} },
                { label: 'one', data: [1, 2], order: 1, trendlineLinear: {} },
            ],
        });

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        const drawnLabels = addFitter.mock.calls.map((call) => call[2].label);
        expect(drawnLabels).toEqual(['one', 'two', 'zero']);
    });

    it('treats a missing order as order 0', () => {
        const chart = createChart({
            datasets: [
                { label: 'no-order', data: [1, 2], trendlineLinear: {} },
                { label: 'order-5', data: [1, 2], order: 5, trendlineLinear: {} },
            ],
        });

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        const drawnLabels = addFitter.mock.calls.map((call) => call[2].label);
        expect(drawnLabels).toEqual(['order-5', 'no-order']);
    });

    it('resets the line dash when it is done', () => {
        const chart = createChart({
            datasets: [{ label: 'a', data: [1, 2], trendlineLinear: {} }],
        });

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(ctx.setLineDash).toHaveBeenCalledWith([]);
    });

    it('does not throw when the chart has no datasets', () => {
        const chart = createChart({ datasets: [] });

        expect(() => pluginTrendlineLinear.afterDatasetsDraw(chart)).not.toThrow();
        expect(ctx.setLineDash).toHaveBeenCalledWith([]);
    });

    /**
     * Regression: a dataset bound to a non-default x axis must be fitted
     * against that axis. getScales() returns a single horizontal scale for the
     * whole chart, so every dataset currently gets whichever horizontal scale
     * was iterated last. yAxisID is honoured inside addFitter, xAxisID is not.
     *
     * test.failing = the suite stays green while the bug exists, and this test
     * turns red as soon as the bug is fixed — then remove `.failing`.
     */
    test('uses the scale from dataset.xAxisID when several x axes exist', () => {
        const chart = createChart({
            datasets: [
                { label: 'on-x', data: [1, 2], xAxisID: 'x', trendlineLinear: {} },
                { label: 'on-x2', data: [1, 2], xAxisID: 'x2', trendlineLinear: {} },
            ],
            scales: {
                x: { id: 'x', isHorizontal: () => true },
                x2: { id: 'x2', isHorizontal: () => true },
                y: { id: 'y', isHorizontal: () => false },
            },
        });

        pluginTrendlineLinear.afterDatasetsDraw(chart);

        expect(addFitter.mock.calls[0][3]).toBe(chart.scales.x);
        expect(addFitter.mock.calls[1][3]).toBe(chart.scales.x2);
    });
});
