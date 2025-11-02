import terser from '@rollup/plugin-terser';

const banner = `/*!
 * chartjs-plugin-trendline v${process.env.npm_package_version}
 * https://github.com/Makanz/chartjs-plugin-trendline
 * (c) ${new Date().getFullYear()} Marcus Alsterfjord
 * Released under the MIT license
 */`;

export default [
  // ESM build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/chartjs-plugin-trendline.esm.js',
      format: 'esm',
      banner,
    },
  },
  // CommonJS build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/chartjs-plugin-trendline.cjs',
      format: 'cjs',
      banner,
      exports: 'default',
    },
  },
  // UMD build (unminified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/chartjs-plugin-trendline.js',
      format: 'umd',
      name: 'ChartJSTrendline',
      banner,
      exports: 'default',
    },
  },
  // UMD build (minified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/chartjs-plugin-trendline.min.js',
      format: 'umd',
      name: 'ChartJSTrendline',
      banner,
      exports: 'default',
      sourcemap: true,
    },
    plugins: [terser()],
  },
];
