/**
 * Generates an accessible description string for a trendline.
 * @param {Object} fitter - The LineFitter or ExponentialFitter instance.
 * @param {Object} dataset - The chart dataset configuration.
 * @param {boolean} isExponential - Whether this is an exponential trendline.
 * @returns {string} A human-readable description for screen readers.
 */
export function generateTrendlineDescription(fitter, dataset, isExponential) {
    if (!fitter || fitter.count < 2) return '';

    const slope = fitter.slope();
    const intercept = fitter.intercept();
    const dataLabel = dataset.label || 'Dataset';
    const trendType = isExponential ? 'Exponential trendline' : 'Linear trendline';

    if (!isFinite(slope) || !isFinite(intercept)) {
        return `${trendType} for ${dataLabel}: could not be calculated.`;
    }

    // Format slope with direction context
    let slopeDesc;
    if (Math.abs(slope) < 0.0001) {
        slopeDesc = 'flat (zero slope)';
    } else if (slope > 0) {
        slopeDesc = `upward with slope of ${slope.toFixed(2)}`;
    } else {
        slopeDesc = `downward with slope of ${slope.toFixed(2)}`;
    }

    const interceptDesc = `crossing at ${intercept.toFixed(2)}`;
    const pointsDesc = `based on ${fitter.count} data points`;

    return `${trendType} for ${dataLabel}: ${slopeDesc}, intercept ${interceptDesc}, ${pointsDesc}.`;
}

/**
 * Generates an accessible description for all trendlines in a chart.
 * Aggregates descriptions from all datasets that have trendline configurations.
 * @param {Chart} chartInstance - The Chart.js chart instance.
 * @returns {string} Combined description for all trendlines.
 */
export function generateChartTrendlineDescription(chartInstance) {
    const descriptions = [];

    chartInstance.data.datasets.forEach((dataset) => {
        const isExponential = !!dataset.trendlineExponential;
        const config = dataset.trendlineExponential || dataset.trendlineLinear;

        if (!config) return;

        // If explicit a11y description is provided, use it
        if (config.accessibility && config.accessibility.description) {
            descriptions.push(config.accessibility.description);
            return;
        }

        // Build a description from the config
        const dataLabel = dataset.label || 'Dataset';
        const trendType = isExponential ? 'Exponential trendline' : 'Linear trendline';

        if (config.accessibility && config.accessibility.label) {
            descriptions.push(`${trendType} for ${dataLabel}: ${config.accessibility.label}`);
        } else {
            descriptions.push(`${trendType} for ${dataLabel}.`);
        }
    });

    return descriptions.join(' ');
}

/**
 * Applies ARIA attributes to the chart canvas for trendline accessibility.
 * Sets role="img" and a descriptive aria-label on the canvas element.
 * @param {Chart} chartInstance - The Chart.js chart instance.
 */
export function applyCanvasAccessibility(chartInstance) {
    const canvas = chartInstance.canvas;
    if (!canvas) return;

    // Set role="img" for screen readers to treat canvas as an image
    canvas.setAttribute('role', 'img');

    // Generate and apply description
    const description = generateChartTrendlineDescription(chartInstance);
    if (description) {
        const existingLabel = canvas.getAttribute('aria-label') || '';
        if (existingLabel) {
            // Append to existing aria-label if chart already has one
            canvas.setAttribute('aria-label', `${existingLabel}. ${description}`);
        } else {
            canvas.setAttribute('aria-label', description);
        }
    }
}
