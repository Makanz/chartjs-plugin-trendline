/*!
 * chartjs-plugin-trendline v3.2.4
 * https://github.com/Makanz/chartjs-plugin-trendline
 * (c) 2026 Marcus Alsterfjord
 * Released under the MIT license
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ChartJSTrendline = factory());
})(this, (function () { 'use strict';

    /**
     * A class that fits a line to a series of points using least squares.
     */
    class LineFitter {
        constructor() {
            this.count = 0;
            this.sumx = 0;
            this.sumy = 0;
            this.sumx2 = 0;
            this.sumxy = 0;
            this.minx = Number.MAX_VALUE;
            this.maxx = Number.MIN_VALUE;
            this._cachedSlope = null;
            this._cachedIntercept = null;
            this._cacheValid = false;
        }

        /**
         * Adds a point to the line fitter.
         * @param {number} x - The x-coordinate of the point.
         * @param {number} y - The y-coordinate of the point.
         */
        add(x, y) {
            this.sumx += x;
            this.sumy += y;
            this.sumx2 += x * x;
            this.sumxy += x * y;
            if (x < this.minx) this.minx = x;
            if (x > this.maxx) this.maxx = x;
            this.count++;
            this._cacheValid = false;
        }

        /**
         * Calculates the slope of the fitted line.
         * @returns {number} - The slope of the line.
         */
        slope() {
            if (!this._cacheValid) {
                this._computeCoefficients();
            }
            return this._cachedSlope;
        }

        /**
         * Calculates the y-intercept of the fitted line.
         * @returns {number} - The y-intercept of the line.
         */
        intercept() {
            if (!this._cacheValid) {
                this._computeCoefficients();
            }
            return this._cachedIntercept;
        }

        /**
         * Returns the fitted value (y) for a given x.
         * @param {number} x - The x-coordinate.
         * @returns {number} - The corresponding y-coordinate on the fitted line.
         */
        f(x) {
            return this.slope() * x + this.intercept();
        }

        /**
         * Calculates the projection of the line for the future value.
         * @returns {number} - The future value based on the fitted line.
         */
        fo() {
            return -this.intercept() / this.slope();
        }

        /**
         * Returns the scale (variance) of the fitted line.
         * @returns {number} - The scale of the fitted line.
         */
        scale() {
            return this.slope();
        }

        _computeCoefficients() {
            const denominator = this.count * this.sumx2 - this.sumx * this.sumx;
            this._cachedSlope = (this.count * this.sumxy - this.sumx * this.sumy) / denominator;
            this._cachedIntercept = (this.sumy - this._cachedSlope * this.sumx) / this.count;
            this._cacheValid = true;
        }
    }

    /**
     * A class that fits an exponential curve to a series of points using least squares.
     * Fits y = a * e^(b*x) by transforming to ln(y) = ln(a) + b*x
     */
    class ExponentialFitter {
        constructor() {
            this.count = 0;
            this.sumx = 0;
            this.sumlny = 0;
            this.sumx2 = 0;
            this.sumxlny = 0;
            this.minx = Number.MAX_VALUE;
            this.maxx = Number.MIN_VALUE;
            this.hasValidData = true;
            this.dataPoints = []; // Store data points for correlation calculation
            this._cachedGrowthRate = null;
            this._cachedCoefficient = null;
            this._cachedCorrelation = null;
            this._cacheValid = false;
        }

        /**
         * Adds a point to the exponential fitter.
         * @param {number} x - The x-coordinate of the point.
         * @param {number} y - The y-coordinate of the point.
         */
        add(x, y) {
            if (y <= 0) {
                this.hasValidData = false;
                return;
            }

            const lny = Math.log(y);
            if (!isFinite(lny)) {
                this.hasValidData = false;
                return;
            }

            this.sumx += x;
            this.sumlny += lny;
            this.sumx2 += x * x;
            this.sumxlny += x * lny;
            if (x < this.minx) this.minx = x;
            if (x > this.maxx) this.maxx = x;
            this.dataPoints.push({x, y, lny}); // Store actual data points
            this.count++;
            this._cacheValid = false;
        }

        /**
         * Calculates the exponential growth rate (b in y = a * e^(b*x)).
         * @returns {number} - The exponential growth rate.
         */
        growthRate() {
            if (!this.hasValidData || this.count < 2) return 0;
            if (!this._cacheValid) {
                this._computeCoefficients();
            }
            return this._cachedGrowthRate;
        }

        /**
         * Calculates the exponential coefficient (a in y = a * e^(b*x)).
         * @returns {number} - The exponential coefficient.
         */
        coefficient() {
            if (!this.hasValidData || this.count < 2) return 1;
            if (!this._cacheValid) {
                this._computeCoefficients();
            }
            return this._cachedCoefficient;
        }

        /**
         * Returns the fitted exponential value (y) for a given x.
         * @param {number} x - The x-coordinate.
         * @returns {number} - The corresponding y-coordinate on the fitted exponential curve.
         */
        f(x) {
            if (!this.hasValidData || this.count < 2) return 0;
            if (!this._cacheValid) {
                this._computeCoefficients();
            }
            
            // Check for potential overflow before calculation
            if (Math.abs(this._cachedGrowthRate * x) > 500) return 0; // Safer limit to prevent overflow
            
            const result = this._cachedCoefficient * Math.exp(this._cachedGrowthRate * x);
            return isFinite(result) ? result : 0;
        }

        /**
         * Calculates the correlation coefficient (R-squared) for the exponential fit.
         * @returns {number} - The correlation coefficient (0-1).
         */
        correlation() {
            if (!this.hasValidData || this.count < 2) return 0;
            if (!this._cacheValid) {
                this._computeCoefficients();
            }
            return this._cachedCorrelation;
        }

        /**
         * Returns the scale (growth rate) of the fitted exponential curve.
         * @returns {number} - The growth rate of the exponential curve.
         */
        scale() {
            return this.growthRate();
        }

        _computeCoefficients() {
            if (!this.hasValidData || this.count < 2) {
                this._cachedGrowthRate = 0;
                this._cachedCoefficient = 1;
                this._cachedCorrelation = 0;
                this._cacheValid = true;
                return;
            }

            const denominator = this.count * this.sumx2 - this.sumx * this.sumx;
            if (Math.abs(denominator) < 1e-10) {
                this._cachedGrowthRate = 0;
                this._cachedCoefficient = 1;
                this._cachedCorrelation = 0;
                this._cacheValid = true;
                return;
            }

            this._cachedGrowthRate = (this.count * this.sumxlny - this.sumx * this.sumlny) / denominator;
            const lnA = (this.sumlny - this._cachedGrowthRate * this.sumx) / this.count;
            this._cachedCoefficient = Math.exp(lnA);

            const meanLnY = this.sumlny / this.count;
            let ssTotal = 0;
            let ssRes = 0;
            
            for (const point of this.dataPoints) {
                const predictedLnY = lnA + this._cachedGrowthRate * point.x;
                ssTotal += Math.pow(point.lny - meanLnY, 2);
                ssRes += Math.pow(point.lny - predictedLnY, 2);
            }
            
            this._cachedCorrelation = ssTotal === 0 ? 1 : Math.max(0, 1 - (ssRes / ssTotal));
            this._cacheValid = true;
        }
    }

    /**
     * Retrieves the x and y scales from the chart instance.
     * @param {Chart} chartInstance - The chart instance.
     * @returns {Object} - The xScale and yScale of the chart.
     */
    const getScales = (chartInstance) => {
        let xScale, yScale;
        for (const scale of Object.values(chartInstance.scales)) {
            if (scale.isHorizontal()) xScale = scale;
            else yScale = scale;
            if (xScale && yScale) break;
        }
        return { xScale, yScale };
    };

    /**
     * Sets the line style (dashed, dotted, solid) for the canvas context.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     * @param {string} lineStyle - The style of the line ('dotted', 'dashed', 'solid', etc.).
     */
    const setLineStyle = (ctx, lineStyle) => {
        switch (lineStyle) {
            case 'dotted':
                ctx.setLineDash([2, 2]);
                break;
            case 'dashed':
                ctx.setLineDash([8, 3]);
                break;
            case 'dashdot':
                ctx.setLineDash([8, 3, 2, 3]);
                break;
            case 'solid':
            default:
                ctx.setLineDash([]);
                break;
        }
    };

    /**
     * Draws the trendline on the canvas context.
     * @param {Object} params - The trendline parameters.
     * @param {CanvasRenderingContext2D} params.ctx - The canvas rendering context.
     * @param {number} params.x1 - Starting x-coordinate of the trendline.
     * @param {number} params.y1 - Starting y-coordinate of the trendline.
     * @param {number} params.x2 - Ending x-coordinate of the trendline.
     * @param {number} params.y2 - Ending y-coordinate of the trendline.
     * @param {string} params.colorMin - The starting color of the trendline gradient.
     * @param {string} params.colorMax - The ending color of the trendline gradient.
     */
    const drawTrendline = ({ ctx, x1, y1, x2, y2, colorMin, colorMax }) => {
        // Ensure all values are finite numbers
        if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) {
            console.warn(
                'Cannot draw trendline: coordinates contain non-finite values',
                { x1, y1, x2, y2 }
            );
            return;
        }

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        try {
            // Additional validation for degenerate gradients
            const dx = x2 - x1;
            const dy = y2 - y1;
            const gradientLength = Math.sqrt(dx * dx + dy * dy);
            
            // If the gradient vector is too small, createLinearGradient may fail
            if (gradientLength < 0.01) {
                console.warn('Gradient vector too small, using solid color:', { x1, y1, x2, y2, length: gradientLength });
                ctx.strokeStyle = colorMin;
            } else {
                let gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                gradient.addColorStop(0, colorMin);
                gradient.addColorStop(1, colorMax);
                ctx.strokeStyle = gradient;
            }
        } catch (e) {
            // Fallback to solid color if gradient creation fails
            console.warn('Gradient creation failed, using solid color:', e);
            ctx.strokeStyle = colorMin;
        }

        ctx.stroke();
        ctx.closePath();
    };

    /**
     * Fills the area below the trendline with the specified color.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     * @param {number} x1 - Starting x-coordinate of the trendline.
     * @param {number} y1 - Starting y-coordinate of the trendline.
     * @param {number} x2 - Ending x-coordinate of the trendline.
     * @param {number} y2 - Ending y-coordinate of the trendline.
     * @param {number} drawBottom - The bottom boundary of the chart.
     * @param {string} fillColor - The color to fill below the trendline.
     */
    const fillBelowTrendline = (ctx, x1, y1, x2, y2, drawBottom, fillColor) => {
        // Ensure all values are finite numbers
        if (
            !isFinite(x1) ||
            !isFinite(y1) ||
            !isFinite(x2) ||
            !isFinite(y2) ||
            !isFinite(drawBottom)
        ) {
            console.warn(
                'Cannot fill below trendline: coordinates contain non-finite values',
                { x1, y1, x2, y2, drawBottom }
            );
            return;
        }

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, drawBottom);
        ctx.lineTo(x1, drawBottom);
        ctx.lineTo(x1, y1);
        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.fill();
    };

    /**
     * Adds a label to the trendline at the calculated angle.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     * @param {string} label - The label text to add.
     * @param {number} x1 - The starting x-coordinate of the trendline.
     * @param {number} y1 - The starting y-coordinate of the trendline.
     * @param {number} x2 - The ending x-coordinate of the trendline.
     * @param {number} y2 - The ending y-coordinate of the trendline.
     * @param {number} angle - The angle (in radians) of the trendline.
     * @param {string} labelColor - The color of the label text.
     * @param {string} family - The font family for the label text.
     * @param {number} size - The font size for the label text.
     * @param {number} offset - The offset of the label from the trendline
     */
    const addTrendlineLabel = (
        ctx,
        label,
        x1,
        y1,
        x2,
        y2,
        angle,
        labelColor,
        family,
        size,
        offset
    ) => {
        // Set the label font and color
        ctx.font = `${size}px ${family}`;
        ctx.fillStyle = labelColor;

        // Label width
        const labelWidth = ctx.measureText(label).width;

        // Calculate the center of the trendline
        const labelX = (x1 + x2) / 2;
        const labelY = (y1 + y2) / 2;

        // Save the current state of the canvas
        ctx.save();

        // Translate to the label position
        ctx.translate(labelX, labelY);

        // Rotate the context to align with the trendline
        ctx.rotate(angle);

        // Adjust for the length of the label and rotation
        const adjustedX = -labelWidth / 2; // Center the label horizontally
        const adjustedY = offset; // Adjust Y to compensate for the height

        // Draw the label
        ctx.fillText(label, adjustedX, adjustedY);

        // Restore the canvas state
        ctx.restore();
    };

    /**
     * Gets the appropriate yScale based on dataset yAxisID or falls back to default yScale.
     * @param {Object} datasetMeta - Metadata about the dataset.
     * @param {Object} dataset - The dataset configuration.
     * @param {Object} yScale - The default y-scale object.
     * @returns {Object} The y-scale to use for drawing.
     */
    function getYScale(datasetMeta, dataset, yScale) {
        const yAxisID = dataset.yAxisID || 'y';
        return datasetMeta.controller.chart.scales[yAxisID] || yScale;
    }

    /**
     * Extracts trendline configuration from dataset.
     * @param {Object} dataset - The dataset configuration.
     * @returns {Object} The trendline configuration object.
     */
    function getTrendlineConfig(dataset) {
        return dataset.trendlineExponential || dataset.trendlineLinear || {};
    }

    /**
     * Extracts label configuration from trendline config.
     * @param {Object} trendlineConfig - The trendline configuration.
     * @param {boolean} isExponential - Whether the trendline is exponential.
     * @returns {Object} The label configuration.
     */
    function getLabelConfig(trendlineConfig, isExponential) {
        const defaultColor = 'rgba(169,169,169, .6)';
        const {
            color = defaultColor,
            text = isExponential ? 'Exponential Trendline' : 'Trendline',
            display = true,
            displayValue = true,
            offset = 10,
            percentage = false,
        } = (trendlineConfig && trendlineConfig.label) || {};

        const {
            family = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
            size = 12,
        } = (trendlineConfig && trendlineConfig.label && trendlineConfig.label.font) || {};

        return { color, text, display, displayValue, offset, percentage, family, size };
    }

    /**
     * Creates the appropriate fitter instance (LineFitter or ExponentialFitter).
     * @param {boolean} isExponential - Whether to create an exponential fitter.
     * @returns {Object} The fitter instance.
     */
    function createFitter(isExponential) {
        return isExponential ? new ExponentialFitter() : new LineFitter();
    }

    /**
     * Collects and validates data points for the fitter, handling trendoffset and various data formats.
     * @param {Object} fitter - The fitter instance.
     * @param {Object} dataset - The dataset configuration.
     * @param {Object} datasetMeta - Metadata about the dataset.
     * @param {Object} xScale - The x-scale object.
     * @param {Object} yScaleToUse - The y-scale to use.
     * @returns {boolean} Whether enough data points were collected.
     */
    function collectDataPoints(fitter, dataset, datasetMeta, xScale, yScaleToUse) {
        const trendlineConfig = getTrendlineConfig(dataset);
        let trendoffset = trendlineConfig.trendoffset || 0;

        // Sanitize trendoffset
        if (Math.abs(trendoffset) >= dataset.data.length) trendoffset = 0;

        // Determine effective first index
        let effectiveFirstIndex = 0;
        if (trendoffset > 0) {
            const firstNonNullAfterOffset = dataset.data.slice(trendoffset).findIndex((d) => d !== undefined && d !== null);
            if (firstNonNullAfterOffset !== -1) {
                effectiveFirstIndex = trendoffset + firstNonNullAfterOffset;
            } else {
                effectiveFirstIndex = dataset.data.length;
            }
        } else {
            const firstNonNull = dataset.data.findIndex((d) => d !== undefined && d !== null);
            if (firstNonNull !== -1) {
                effectiveFirstIndex = firstNonNull;
            } else {
                effectiveFirstIndex = dataset.data.length;
            }
        }

        // Determine data structure type
        let xy = effectiveFirstIndex < dataset.data.length && typeof dataset.data[effectiveFirstIndex] === 'object';

        // Get chart options for parsing
        const chartOptions = datasetMeta.controller.chart.options;
        const parsingOptions = typeof chartOptions.parsing === 'object' ? chartOptions.parsing : undefined;
        const xAxisKey = trendlineConfig?.xAxisKey || parsingOptions?.xAxisKey || 'x';
        const yAxisKey = trendlineConfig?.yAxisKey || parsingOptions?.yAxisKey || 'y';

        // Collect points
        dataset.data.forEach((data, index) => {
            if (data == null) return;

            // Apply trendoffset logic
            if (trendoffset > 0 && index < effectiveFirstIndex) return;
            if (trendoffset < 0 && index >= dataset.data.length + trendoffset) return;

            // Process data based on scale type and data structure
            if (['time', 'timeseries'].includes(xScale.options.type) && xy) {
                let x = data[xAxisKey] != null ? data[xAxisKey] : data.t;
                const yValue = data[yAxisKey];

                if (x != null && x !== undefined && yValue != null && !isNaN(yValue)) {
                    fitter.add(new Date(x).getTime(), yValue);
                }
            } else if (xy) {
                const xVal = data[xAxisKey];
                const yVal = data[yAxisKey];

                const xIsValid = xVal != null && !isNaN(xVal);
                const yIsValid = yVal != null && !isNaN(yVal);

                if (xIsValid && yIsValid) {
                    fitter.add(xVal, yVal);
                }
            } else if (['time', 'timeseries'].includes(xScale.options.type) && !xy) {
                const chartLabels = datasetMeta.controller.chart.data.labels;
                if (chartLabels && chartLabels[index] && data != null && !isNaN(data)) {
                    const timeValue = new Date(chartLabels[index]).getTime();
                    if (!isNaN(timeValue)) {
                        fitter.add(timeValue, data);
                    }
                }
            } else {
                if (data != null && !isNaN(data)) {
                    fitter.add(index, data);
                }
            }
        });

        return fitter.count >= 2;
    }

    /**
     * Calculates trendline coordinates based on projection mode.
     * @param {Object} fitter - The fitter instance.
     * @param {Object} xScale - The x-scale object.
     * @param {Object} yScaleToUse - The y-scale to use.
     * @param {Object} chartArea - The chart area.
     * @param {boolean} isExponential - Whether the trendline is exponential.
     * @param {Object} trendlineConfig - The trendline configuration.
     * @returns {Object|null} The clipped coordinates or null if invalid.
     */
    function calculateTrendlineCoordinates(fitter, xScale, yScaleToUse, chartArea, isExponential, trendlineConfig) {
        let x1_px, y1_px, x2_px, y2_px;

        if (trendlineConfig.projection) {
            let points = [];

            if (isExponential) {
                const val_x_left = xScale.getValueForPixel(chartArea.left);
                const y_at_left = fitter.f(val_x_left);
                points.push({ x: val_x_left, y: y_at_left });

                const val_x_right = xScale.getValueForPixel(chartArea.right);
                const y_at_right = fitter.f(val_x_right);
                points.push({ x: val_x_right, y: y_at_right });
            } else {
                const slope = fitter.slope();
                const intercept = fitter.intercept();

                if (Math.abs(slope) > 1e-6) {
                    const val_y_top = yScaleToUse.getValueForPixel(chartArea.top);
                    const x_at_top = (val_y_top - intercept) / slope;
                    points.push({ x: x_at_top, y: val_y_top });

                    const val_y_bottom = yScaleToUse.getValueForPixel(chartArea.bottom);
                    const x_at_bottom = (val_y_bottom - intercept) / slope;
                    points.push({ x: x_at_bottom, y: val_y_bottom });
                } else {
                    points.push({ x: xScale.getValueForPixel(chartArea.left), y: intercept });
                    points.push({ x: xScale.getValueForPixel(chartArea.right), y: intercept });
                }

                const val_x_left = xScale.getValueForPixel(chartArea.left);
                const y_at_left = fitter.f(val_x_left);
                points.push({ x: val_x_left, y: y_at_left });

                const val_x_right = xScale.getValueForPixel(chartArea.right);
                const y_at_right = fitter.f(val_x_right);
                points.push({ x: val_x_right, y: y_at_right });
            }

            const chartMinX = xScale.getValueForPixel(chartArea.left);
            const chartMaxX = xScale.getValueForPixel(chartArea.right);

            const yValsFromPixels = [yScaleToUse.getValueForPixel(chartArea.top), yScaleToUse.getValueForPixel(chartArea.bottom)];
            const finiteYVals = yValsFromPixels.filter(y => isFinite(y));
            const actualChartMinY = finiteYVals.length > 0 ? Math.min(...finiteYVals) : -Infinity;
            const actualChartMaxY = finiteYVals.length > 0 ? Math.max(...finiteYVals) : Infinity;

            let validPoints = points.filter(p =>
                isFinite(p.x) && isFinite(p.y) &&
                p.x >= chartMinX && p.x <= chartMaxX && p.y >= actualChartMinY && p.y <= actualChartMaxY
            );

            validPoints = validPoints.filter((point, index, self) =>
                index === self.findIndex((t) => (
                    Math.abs(t.x - point.x) < 1e-4 && Math.abs(t.y - point.y) < 1e-4
                ))
            );

            if (validPoints.length >= 2) {
                validPoints.sort((a, b) => a.x - b.x || a.y - b.y);

                x1_px = xScale.getPixelForValue(validPoints[0].x);
                y1_px = yScaleToUse.getPixelForValue(validPoints[0].y);
                x2_px = xScale.getPixelForValue(validPoints[validPoints.length - 1].x);
                y2_px = yScaleToUse.getPixelForValue(validPoints[validPoints.length - 1].y);
            } else {
                x1_px = NaN; y1_px = NaN; x2_px = NaN; y2_px = NaN;
            }
        } else {
            const y_at_minx = fitter.f(fitter.minx);
            const y_at_maxx = fitter.f(fitter.maxx);

            x1_px = xScale.getPixelForValue(fitter.minx);
            y1_px = yScaleToUse.getPixelForValue(y_at_minx);
            x2_px = xScale.getPixelForValue(fitter.maxx);
            y2_px = yScaleToUse.getPixelForValue(y_at_maxx);
        }

        return { x1_px, y1_px, x2_px, y2_px };
    }

    /**
     * Clips line coordinates to the chart area using Liang-Barsky algorithm.
     * @param {number} x1 - Starting x-coordinate.
     * @param {number} y1 - Starting y-coordinate.
     * @param {number} x2 - Ending x-coordinate.
     * @param {number} y2 - Ending y-coordinate.
     * @param {Object} chartArea - The chart area.
     * @returns {Object|null} Clipped coordinates or null if line is outside.
     */
    function clipCoordinates(x1, y1, x2, y2, chartArea) {
        let dx = x2 - x1;
        let dy = y2 - y1;
        let t0 = 0.0;
        let t1 = 1.0;

        const p = [-dx, dx, -dy, dy];
        const q = [
            x1 - chartArea.left,
            chartArea.right - x1,
            y1 - chartArea.top,
            chartArea.bottom - y1,
        ];

        for (let i = 0; i < 4; i++) {
            if (p[i] === 0) {
                if (q[i] < 0) return null;
            } else {
                const r = q[i] / p[i];
                if (p[i] < 0) {
                    if (r > t1) return null;
                    t0 = Math.max(t0, r);
                } else {
                    if (r < t0) return null;
                    t1 = Math.min(t1, r);
                }
            }
        }

        if (t0 > t1) return null;

        const clippedX1 = x1 + t0 * dx;
        const clippedY1 = y1 + t0 * dy;
        const clippedX2 = x1 + t1 * dx;
        const clippedY2 = y1 + t1 * dy;

        return { x1: clippedX1, y1: clippedY1, x2: clippedX2, y2: clippedY2 };
    }

    /**
     * Draws the trendline and fills below it if configured.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     * @param {Object} coords - The trendline coordinates.
     * @param {Object} chartArea - The chart area.
     * @param {Object} trendlineConfig - The trendline configuration.
     */
    function drawTrendlineAndFill(ctx, coords, chartArea, trendlineConfig) {
        const { x1_px, y1_px, x2_px, y2_px } = coords;
        const lineWidth = trendlineConfig.width || 3;
        const lineStyle = trendlineConfig.lineStyle || 'solid';
        const fillColor = trendlineConfig.fillColor || false;
        const colorMin = trendlineConfig.colorMin || trendlineConfig.color || 'rgba(169,169,169, .6)';
        const colorMax = trendlineConfig.colorMax || trendlineConfig.color || 'rgba(169,169,169, .6)';

        ctx.lineWidth = lineWidth;
        setLineStyle(ctx, lineStyle);
        drawTrendline({ ctx, x1: x1_px, y1: y1_px, x2: x2_px, y2: y2_px, colorMin, colorMax });

        if (fillColor) {
            fillBelowTrendline(ctx, x1_px, y1_px, x2_px, y2_px, chartArea.bottom, fillColor);
        }
    }

    /**
     * Adds a label to the trendline if configured.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     * @param {Object} fitter - The fitter instance.
     * @param {Object} coords - The trendline coordinates.
     * @param {Object} trendlineConfig - The trendline configuration.
     * @param {Object} labelConfig - The label configuration.
     * @param {boolean} isExponential - Whether the trendline is exponential.
     */
    function addLabelIfNeeded(ctx, fitter, coords, trendlineConfig, labelConfig, isExponential) {
        // Only add label if trendlineConfig.label exists and display is not false
        if (!trendlineConfig.label || labelConfig.display === false) return;

        const angle = Math.atan2(coords.y2_px - coords.y1_px, coords.x2_px - coords.x1_px);
        let trendText = labelConfig.text;

        if (labelConfig.displayValue) {
            if (isExponential) {
                const coefficient = fitter.coefficient();
                const growthRate = fitter.growthRate();
                trendText = `${labelConfig.text} (a=${coefficient.toFixed(2)}, b=${growthRate.toFixed(2)})`;
            } else {
                const displaySlope = fitter.slope();
                trendText = `${labelConfig.text} (Slope: ${
                labelConfig.percentage
                    ? (displaySlope * 100).toFixed(2) + '%'
                    : displaySlope.toFixed(2)
            })`;
            }
        }

        addTrendlineLabel(
            ctx,
            trendText,
            coords.x1_px,
            coords.y1_px,
            coords.x2_px,
            coords.y2_px,
            angle,
            labelConfig.color,
            labelConfig.family,
            labelConfig.size,
            labelConfig.offset
        );
    }

    /**
     * Adds a trendline (fitter) to the dataset on the chart and optionally labels it with trend value.
     * @param {Object} datasetMeta - Metadata about the dataset.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     * @param {Object} dataset - The dataset configuration from the chart.
     * @param {Scale} xScale - The x-axis scale object.
     * @param {Scale} yScale - The y-axis scale object.
     */
    const addFitter = (datasetMeta, ctx, dataset, xScale, yScale) => {
        const yScaleToUse = getYScale(datasetMeta, dataset, yScale);
        const isExponential = !!dataset.trendlineExponential;
        const trendlineConfig = getTrendlineConfig(dataset);
        const labelConfig = getLabelConfig(trendlineConfig, isExponential);

        const fitter = createFitter(isExponential);

        // Collect data points
        const hasEnoughPoints = collectDataPoints(fitter, dataset, datasetMeta, xScale);
        if (!hasEnoughPoints) return;

        // Calculate trendline coordinates
        const chartArea = datasetMeta.controller.chart.chartArea;
        const coords = calculateTrendlineCoordinates(fitter, xScale, yScaleToUse, chartArea, isExponential, trendlineConfig);

        // Check if coordinates are valid
        if (!isFinite(coords.x1_px) || !isFinite(coords.y1_px) || !isFinite(coords.x2_px) || !isFinite(coords.y2_px)) {
            return;
        }

        // Clip coordinates to chart area
        const clippedCoords = clipCoordinates(coords.x1_px, coords.y1_px, coords.x2_px, coords.y2_px, chartArea);

        if (clippedCoords) {
            const clippedX1 = clippedCoords.x1;
            const clippedY1 = clippedCoords.y1;
            const clippedX2 = clippedCoords.x2;
            const clippedY2 = clippedCoords.y2;

            // Check if line is not too short
            if (Math.abs(clippedX1 - clippedX2) < 0.5 && Math.abs(clippedY1 - clippedY2) < 0.5) {
                return;
            }

            const clippedCoordsObj = { x1_px: clippedX1, y1_px: clippedY1, x2_px: clippedX2, y2_px: clippedY2 };
            drawTrendlineAndFill(ctx, clippedCoordsObj, chartArea, trendlineConfig);
            addLabelIfNeeded(ctx, fitter, clippedCoordsObj, trendlineConfig, labelConfig, isExponential);
        }
    };

    const pluginTrendlineLinear = {
        id: 'chartjs-plugin-trendline',

        afterDatasetsDraw: (chartInstance) => {
            const ctx = chartInstance.ctx;
            const { xScale, yScale } = getScales(chartInstance);

            const sortedDatasets = chartInstance.data.datasets
                .map((dataset, index) => ({ dataset, index }))
                .filter((entry) => entry.dataset.trendlineLinear || entry.dataset.trendlineExponential)
                .sort((a, b) => {
                    const orderA = a.dataset.order ?? 0;
                    const orderB = b.dataset.order ?? 0;

                    // Push 0-order datasets to the end (they draw last / on top)
                    if (orderA === 0 && orderB !== 0) return 1;
                    if (orderB === 0 && orderA !== 0) return -1;

                    // Otherwise, draw lower order first
                    return orderA - orderB;
                });

            sortedDatasets.forEach(({ dataset, index }) => {
                const showTrendline =
                    dataset.alwaysShowTrendline ||
                    chartInstance.isDatasetVisible(index);

                if (showTrendline && dataset.data.length > 1) {
                    const datasetMeta = chartInstance.getDatasetMeta(index);
                    addFitter(datasetMeta, ctx, dataset, xScale, yScale);
                }
            });

            // Reset to solid line after drawing trendline
            ctx.setLineDash([]);
        },

        beforeInit: (chartInstance) => {
            const datasets = chartInstance.data.datasets;

            datasets.forEach((dataset) => {
                const trendlineConfig = dataset.trendlineLinear || dataset.trendlineExponential;
                if (trendlineConfig && (trendlineConfig.label || trendlineConfig.legend)) {
                    // Access chartInstance to update legend labels
                    const originalGenerateLabels =
                        chartInstance.legend.options.labels.generateLabels;

                    chartInstance.legend.options.labels.generateLabels = function (
                        chart
                    ) {
                        const defaultLabels = originalGenerateLabels(chart);

                        const legendConfig = trendlineConfig.legend;

                        // Display the legend if it's populated and not set to hidden
                        if (legendConfig && legendConfig.display !== false) {
                            defaultLabels.push({
                                text: legendConfig.text || dataset.label || 'Trendline',
                                strokeStyle:
                                    legendConfig.strokeStyle ||
                                    legendConfig.color ||
                                    dataset.borderColor ||
                                    'rgba(169,169,169, .6)',
                                fillStyle: legendConfig.fillStyle || 'transparent',
                                lineCap: legendConfig.lineCap || 'butt',
                                lineDash: legendConfig.lineDash || [],
                                lineWidth: legendConfig.lineWidth ?? legendConfig.width ?? 1,
                            });
                        }
                        return defaultLabels;
                    };
                }
            });
        },
    };

    // If we're in the browser and have access to the global Chart obj, register plugin automatically
    if (typeof window !== 'undefined' && window.Chart) {
        if (window.Chart.hasOwnProperty('register')) {
            window.Chart.register(pluginTrendlineLinear);
        } else {
            window.Chart.plugins.register(pluginTrendlineLinear);
        }
    }

    return pluginTrendlineLinear;

}));
