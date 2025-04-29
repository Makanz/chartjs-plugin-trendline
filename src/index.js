import { pluginTrendlineLinear } from './core/plugin';

// If we're in the browser and have access to the global Chart obj, register plugin automatically
if (typeof window !== 'undefined' && window.Chart) {
    if (window.Chart.hasOwnProperty('register')) {
        window.Chart.register(pluginTrendlineLinear);
    } else {
        window.Chart.plugins.register(pluginTrendlineLinear);
    }
}

// Export the plugin
export default pluginTrendlineLinear; 