import { pluginTrendlineLinear } from './core/plugin.js';

// Auto-register plugin when Chart.js is available in the browser
if (typeof window !== 'undefined') {
    const Chart = window.Chart;
    if (Chart) {
        if (typeof Chart.register === 'function') {
            Chart.register(pluginTrendlineLinear);
        } else {
            Chart.plugins.register(pluginTrendlineLinear);
        }
    }
}

export default pluginTrendlineLinear; 