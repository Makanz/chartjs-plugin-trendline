/**
 * src/index.js auto-registers the plugin on import when Chart.js is present on
 * window. That whole file was at 0% coverage because every other test imports
 * the modules directly instead of the package entry point.
 *
 * Each case re-imports the entry point with a fresh module registry so the
 * import-time side effect runs again.
 */
describe('src/index.js - auto registration', () => {
    const loadEntryPoint = () => {
        jest.isolateModules(() => {
            require('./index.js');
        });
    };

    afterEach(() => {
        delete window.Chart;
        jest.resetModules();
    });

    it('registers the plugin with Chart.register (Chart.js v3+)', () => {
        const register = jest.fn();
        window.Chart = { register };

        loadEntryPoint();

        expect(register).toHaveBeenCalledTimes(1);
        expect(register.mock.calls[0][0].id).toBe('chartjs-plugin-trendline');
    });

    it('falls back to Chart.plugins.register (Chart.js v2)', () => {
        const legacyRegister = jest.fn();
        window.Chart = { plugins: { register: legacyRegister } };

        loadEntryPoint();

        expect(legacyRegister).toHaveBeenCalledTimes(1);
    });

    it('does nothing when window.Chart is not defined', () => {
        expect(() => loadEntryPoint()).not.toThrow();
    });

    it('exports the plugin as default', () => {
        window.Chart = { register: jest.fn() };
        let plugin;

        jest.isolateModules(() => {
            plugin = require('./index.js').default;
        });

        expect(plugin.id).toBe('chartjs-plugin-trendline');
        expect(typeof plugin.afterDatasetsDraw).toBe('function');
    });
});
