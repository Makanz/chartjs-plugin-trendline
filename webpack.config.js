const path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'chartjs-plugin-trendline.min.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
