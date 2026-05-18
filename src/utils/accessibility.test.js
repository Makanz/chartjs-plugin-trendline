import {
    generateTrendlineDescription,
    generateChartTrendlineDescription,
    applyCanvasAccessibility,
} from './accessibility.js';
import { LineFitter } from './lineFitter.js';

describe('generateTrendlineDescription', () => {
    let fitter;

    beforeEach(() => {
        fitter = new LineFitter();
        fitter.add(0, 0);
        fitter.add(10, 20); // slope = 2, intercept = 0
    });

    it('should generate a description with slope and intercept for a linear trendline', () => {
        const desc = generateTrendlineDescription(fitter, { label: 'Revenue' }, false);
        expect(desc).toContain('Revenue');
        expect(desc).toContain('upward');
        expect(desc).toContain('2.00');
        expect(desc).toContain('based on 2 data points');
    });

    it('should report downward slope correctly', () => {
        const downward = new LineFitter();
        downward.add(0, 20);
        downward.add(10, 0); // slope = -2, intercept = 20
        const desc = generateTrendlineDescription(downward, { label: 'Cost' }, false);
        expect(desc).toContain('downward');
        expect(desc).toContain('-2.00');
        expect(desc).toContain('20.00');
    });

    it('should report flat line correctly', () => {
        const flat = new LineFitter();
        flat.add(0, 5);
        flat.add(10, 5); // slope = 0, intercept = 5
        const desc = generateTrendlineDescription(flat, { label: 'Steady' }, false);
        expect(desc).toContain('flat');
        expect(desc).toContain('zero slope');
    });

    it('should return empty string when fitter has fewer than 2 points', () => {
        const empty = new LineFitter();
        const desc = generateTrendlineDescription(empty, { label: 'Empty' }, false);
        expect(desc).toBe('');
    });

    it('should fall back to "Dataset" when no label is present', () => {
        const desc = generateTrendlineDescription(fitter, {}, false);
        expect(desc).toContain('Dataset');
    });

    it('should mention exponential trendline type', () => {
        const desc = generateTrendlineDescription(fitter, { label: 'Growth' }, true);
        expect(desc).toContain('Exponential');
    });

    it('should handle NaN slope gracefully', () => {
        const vertical = new LineFitter();
        vertical.add(5, 0);
        vertical.add(5, 10);
        const desc = generateTrendlineDescription(vertical, { label: 'Vertical' }, false);
        expect(desc).toContain('could not be calculated');
    });
});

describe('generateChartTrendlineDescription', () => {
    it('should aggregate descriptions for multiple trendline datasets', () => {
        const chartInstance = {
            data: {
                datasets: [
                    {
                        label: 'Sales',
                        trendlineLinear: {},
                    },
                    {
                        label: 'Visitors',
                        trendlineExponential: {},
                    },
                ],
            },
        };

        const desc = generateChartTrendlineDescription(chartInstance);
        expect(desc).toContain('Linear trendline for Sales');
        expect(desc).toContain('Exponential trendline for Visitors');
    });

    it('should use explicit accessibility description when provided', () => {
        const chartInstance = {
            data: {
                datasets: [
                    {
                        label: 'Sales',
                        trendlineLinear: {
                            accessibility: {
                                description: 'Custom trendline description for sales data.',
                            },
                        },
                    },
                ],
            },
        };

        const desc = generateChartTrendlineDescription(chartInstance);
        expect(desc).toContain('Custom trendline description for sales data.');
        expect(desc).not.toContain('Linear trendline');
    });

    it('should use accessibility label when provided', () => {
        const chartInstance = {
            data: {
                datasets: [
                    {
                        label: 'Sales',
                        trendlineLinear: {
                            accessibility: {
                                label: 'Shows increasing trend over time',
                            },
                        },
                    },
                ],
            },
        };

        const desc = generateChartTrendlineDescription(chartInstance);
        expect(desc).toContain('Linear trendline for Sales: Shows increasing trend over time');
    });

    it('should return empty string when no trendline datasets exist', () => {
        const chartInstance = {
            data: {
                datasets: [{ label: 'Plain Data' }],
            },
        };

        const desc = generateChartTrendlineDescription(chartInstance);
        expect(desc).toBe('');
    });
});

describe('applyCanvasAccessibility', () => {
    let chartInstance;

    beforeEach(() => {
        chartInstance = {
            canvas: document.createElement('canvas'),
            data: {
                datasets: [
                    {
                        label: 'Test Set',
                        trendlineLinear: {},
                    },
                ],
            },
        };
    });

    it('should set role="img" on canvas', () => {
        applyCanvasAccessibility(chartInstance);
        expect(chartInstance.canvas.getAttribute('role')).toBe('img');
    });

    it('should set aria-label with trendline description', () => {
        applyCanvasAccessibility(chartInstance);
        const label = chartInstance.canvas.getAttribute('aria-label');
        expect(label).toContain('Linear trendline for Test Set');
    });

    it('should append to existing aria-label if present', () => {
        chartInstance.canvas.setAttribute('aria-label', 'Chart showing monthly data');
        applyCanvasAccessibility(chartInstance);
        const label = chartInstance.canvas.getAttribute('aria-label');
        expect(label).toContain('Chart showing monthly data');
        expect(label).toContain('Linear trendline for Test Set');
    });

    it('should handle chart without trendline datasets', () => {
        chartInstance.data.datasets = [{ label: 'Plain Data' }];
        applyCanvasAccessibility(chartInstance);
        expect(chartInstance.canvas.getAttribute('role')).toBe('img');
        // No aria-label set since there are no trendlines to describe
        expect(chartInstance.canvas.hasAttribute('aria-label')).toBe(false);
    });

    it('should do nothing when canvas is absent', () => {
        const withoutCanvas = { data: { datasets: [] } };
        expect(() => applyCanvasAccessibility(withoutCanvas)).not.toThrow();
    });
});
