import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    entry: './src/index.js',
    output: {
        filename: 'chartjs-plugin-trendline.min.js',
        path: path.resolve(__dirname, 'dist'),
        library: {
            name: 'chartjsPluginTrendline',
            type: 'umd',
            export: 'default',
        },
        globalObject: 'this',
    },
};
