import { addFitter } from './trendline'; // Import the function to test
import 'jest-canvas-mock'; // Ensures canvas context is mocked

// Import the class to mock its constructor and methods
import { LineFitter } from '../utils/lineFitter';
// Import functions to spy on or mock their implementation
import * as drawingUtils from '../utils/drawing';
import * as labelUtils from './label';

// Mocking dependencies
jest.mock('../utils/lineFitter'); // Auto-mocks all exports, constructor will be jest.fn()

jest.mock('../utils/drawing', () => ({
  drawTrendline: jest.fn(),
  fillBelowTrendline: jest.fn(),
  setLineStyle: jest.fn(),
}));

jest.mock('./label', () => ({
  addTrendlineLabel: jest.fn(),
}));

describe('addFitter', () => {
    let mockCtx;
    let mockDatasetMeta;
    let mockDataset;
    let mockXScale;
    let mockYScale;
    let mockLineFitterInstance;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Mock LineFitter instance and its methods
        mockLineFitterInstance = {
            add: jest.fn(),
            f: jest.fn(x => x * 2 + 1), // Default mock implementation: y = 2x + 1
            slope: jest.fn(() => 2),
            intercept: jest.fn(() => 1),
            fo: jest.fn(() => 50), // Default mock for projection
            scale: jest.fn(() => 1), // Default mock for scale (positive)
            minx: 10, // Default mock value
            maxx: 100, // Default mock value
            count: 0,
            sumx: 0,
            sumy: 0,
            sumx2: 0,
            sumxy: 0,
        };
        LineFitter.mockImplementation(() => mockLineFitterInstance);
        
        mockCtx = {
            save: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn(),
            fillText: jest.fn(),
            measureText: jest.fn(() => ({ width: 50 })),
            font: '',
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            restore: jest.fn(),
        };

        mockDatasetMeta = {
            controller: {
                chart: {
                    scales: {
                        y: { getPixelForValue: jest.fn(val => val * 10) } // Default y-axis scale
                    },
                    options: {
                        parsing: { xAxisKey: 'x', yAxisKey: 'y' }
                    },
                    chartArea: { bottom: 500, width: 800 },
                }
            },
            data: [ // Mocked datasetMeta.data to provide x,y values for start/endPos
                { x: 10, y: 30 }, // Corresponds to data[0]
                { x: 100, y: 210 } // Corresponds to data[data.length-1]
            ]
        };
        
        mockXScale = {
            getPixelForValue: jest.fn(val => val * 10), // Default x-axis scale
            options: { type: 'linear' }
        };
        mockYScale = { // This is the fallback yScale if yAxisID is not found
            getPixelForValue: jest.fn(val => val * 10) 
        };

        mockDataset = {
            data: [
                { x: 10, y: 30 }, { x: 20, y: 50 }, { x: 30, y: 70 } // Simple linear data
            ],
            yAxisID: 'y',
            borderColor: 'blue',
            borderWidth: 2,
            trendlineLinear: {
                colorMin: 'red',
                colorMax: 'red',
                width: 3,
                lineStyle: 'dashed',
                fillColor: false, // No fill by default
                trendoffset: 0,   // No offset by default
                projection: false,// No projection by default
                xAxisKey: 'x',
                yAxisKey: 'y',
                label: {
                    display: true,
                    text: 'My Trend',
                    color: 'black',
                    offset: 5,
                    displayValue: true,
                    percentage: false,
                    font: {
                        family: 'Arial',
                        size: 12,
                    }
                }
            }
        };
    });

    test('Scenario 1: Simple linear data, no projection, no offset', () => {
        // Arrange
        // Use default mockDataset which has simple linear data
        // fitter.f(10) = 2*10+1 = 21, fitter.f(100) = 2*100+1 = 201
        // y1 = yScaleToUse.getPixelForValue(21) = 210
        // y2 = yScaleToUse.getPixelForValue(201) = 2010
        // x1 = datasetMeta.data[0].x = 10 (since startPos is datasetMeta.data[0].x)
        // x2 = datasetMeta.data[lastIndex].x = 100 (since endPos is datasetMeta.data[mockDataset.data.length-1].x)
        
        // Override specific mock values for this test if needed
        mockLineFitterInstance.minx = 10;
        mockLineFitterInstance.maxx = 30; // Based on the data {x:10}, {x:20}, {x:30}
        mockDatasetMeta.data = [ // Ensure datasetMeta.data aligns with dataset.data for start/endPos
            { x: 10 }, { x: 20 }, { x: 30 }
        ];
        mockXScale.getPixelForValue = jest.fn(val => {
            if (val === 10) return 100; // pixel for fitter.minx
            if (val === 30) return 300; // pixel for fitter.maxx
            return val * 10;
        });
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => {
            if (val === mockLineFitterInstance.f(10)) return 210; // pixel for fitter.f(minx)
            if (val === mockLineFitterInstance.f(30)) return 610; // pixel for fitter.f(maxx)
            return val * 10;
        });


        // Act
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        // Assert
        expect(LineFitter).toHaveBeenCalledTimes(1);
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(mockDataset.data.length);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(10, 30);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(20, 50);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(30, 70);

        // Verify how pixel coordinates are determined
        // startPos will be datasetMeta.data[0].x = 10, endPos will be datasetMeta.data[2].x = 30
        // So, x1 and x2 will be these values directly, not from xScale.getPixelForValue(fitter.minx/maxx)
        // y1 and y2 will be yScale.getPixelForValue(fitter.f(fitter.minx/maxx))
        const expectedX1 = 10; // Directly from datasetMeta.data[0].x
        const expectedY1 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(mockLineFitterInstance.f(mockLineFitterInstance.minx));
        const expectedX2 = 30; // Directly from datasetMeta.data[2].x
        const expectedY2 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(mockLineFitterInstance.f(mockLineFitterInstance.maxx));
        
        expect(drawingUtils.setLineStyle).toHaveBeenCalledWith(mockCtx, mockDataset.trendlineLinear.lineStyle);
        expect(mockCtx.lineWidth).toBe(mockDataset.trendlineLinear.width);

        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith({
            ctx: mockCtx,
            x1: expectedX1,
            y1: expectedY1,
            x2: expectedX2,
            y2: expectedY2,
            colorMin: mockDataset.trendlineLinear.colorMin,
            colorMax: mockDataset.trendlineLinear.colorMax,
        });

        expect(labelUtils.addTrendlineLabel).toHaveBeenCalledTimes(1); // Assuming label.display is true
        expect(drawingUtils.fillBelowTrendline).not.toHaveBeenCalled(); // fillColor is false by default
    });

    test('Scenario 2: Data with null or undefined values', () => {
        // Arrange
        mockDataset.data = [
            { x: 10, y: 30 },
            null, // Null data point
            { x: 20, y: 50 },
            undefined, // Undefined data point
            { x: 30, y: 70 }
        ];
        mockLineFitterInstance.minx = 10;
        mockLineFitterInstance.maxx = 30;
         mockDatasetMeta.data = [ // Ensure datasetMeta.data aligns with dataset.data for start/endPos
            { x: 10 }, null, { x: 20 }, undefined, { x: 30 }
        ];
        // Adjust y-scale mock for potentially different fitter values if nulls changed calculation
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => val * 10);


        // Act
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        // Assert
        expect(LineFitter).toHaveBeenCalledTimes(1);
        // fitter.add should only be called for valid data points
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(3);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(10, 30);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(20, 50);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(30, 70);
        // Other assertions (drawing, styling, label) would follow similarly
        expect(drawingUtils.setLineStyle).toHaveBeenCalledTimes(1);
        expect(drawingUtils.drawTrendline).toHaveBeenCalledTimes(1);
        expect(labelUtils.addTrendlineLabel).toHaveBeenCalledTimes(1);
    });

    test('Scenario 3: trendlineLinear.projection is true and fitter.scale() < 0', () => {
        // Arrange
        mockDataset.trendlineLinear.projection = true;
        mockLineFitterInstance.scale = jest.fn(() => -1); // scale() < 0
        mockLineFitterInstance.fo = jest.fn(() => 40); // Projected x-value
        mockLineFitterInstance.minx = 10;
        mockLineFitterInstance.maxx = 30; // Original maxx before projection
        
        mockDatasetMeta.data = [{ x: 10 }, { x: 20 }, { x: 30 }];
        const yAtMinX = mockLineFitterInstance.f(mockLineFitterInstance.minx); // e.g. 2*10+1 = 21
        const yAtFo = mockLineFitterInstance.f(mockLineFitterInstance.fo());   // e.g. 2*40+1 = 81

        mockXScale.getPixelForValue = jest.fn(val => {
            if (val === mockLineFitterInstance.fo()) return 400; // Pixel for projected x
            return val * 10; // Fallback for minx
        });
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => {
            if (val === yAtMinX) return 210;
            if (val === yAtFo) return 810;
            return val * 10;
        });
        
        // Act
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        // Assert
        expect(LineFitter).toHaveBeenCalledTimes(1);
        expect(mockLineFitterInstance.scale).toHaveBeenCalled();
        expect(mockLineFitterInstance.fo).toHaveBeenCalled();

        const expectedX1 = 10; // datasetMeta.data[0].x
        const expectedY1 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(yAtMinX);
        // x2 is now xScale.getPixelForValue(fitter.fo()) because projection is active
        const expectedX2 = mockXScale.getPixelForValue(mockLineFitterInstance.fo());
        const expectedY2 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(yAtFo);

        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({
            x1: expectedX1,
            y1: expectedY1,
            x2: expectedX2,
            y2: expectedY2,
        }));
    });
    
    test('Scenario 3b: trendlineLinear.projection is true, fitter.scale() < 0, AND fo() < minx', () => {
        // Arrange
        mockDataset.trendlineLinear.projection = true;
        mockLineFitterInstance.scale = jest.fn(() => -1); // scale() < 0
        mockLineFitterInstance.minx = 10;
        mockLineFitterInstance.maxx = 30;
        mockLineFitterInstance.fo = jest.fn(() => 5); // Projected x-value IS LESS THAN minx

        mockDatasetMeta.data = [{ x: 10 }, { x: 20 }, { x: 30 }];
        const yAtMinX = mockLineFitterInstance.f(mockLineFitterInstance.minx);
        const yAtMaxX = mockLineFitterInstance.f(mockLineFitterInstance.maxx); // Should use f(maxx) as x2val becomes maxx

        mockXScale.getPixelForValue = jest.fn(val => {
            if (val === mockLineFitterInstance.minx) return 100;
            if (val === mockLineFitterInstance.maxx) return 300; // Pixel for fitter.maxx (used due to fo < minx)
            return val * 10;
        });
         mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => {
            if (val === yAtMinX) return 210;
            if (val === yAtMaxX) return 610; // Pixel for y at maxx
            return val * 10;
        });

        // Act
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        // Assert
        expect(LineFitter).toHaveBeenCalledTimes(1);
        expect(mockLineFitterInstance.scale).toHaveBeenCalled();
        expect(mockLineFitterInstance.fo).toHaveBeenCalled();

        // x1 is datasetMeta.data[0].x
        // x2 is xScale.getPixelForValue(fitter.maxx) because fo() < minx lead to x2value = fitter.maxx
        const expectedX1 = 10;
        const expectedY1 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(yAtMinX);
        const expectedX2 = mockXScale.getPixelForValue(mockLineFitterInstance.maxx);
        const expectedY2 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(yAtMaxX);


        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({
            x1: expectedX1,
            y1: expectedY1,
            x2: expectedX2,
            y2: expectedY2,
        }));
    });


    test('Scenario 4: trendoffset (positive)', () => {
        // Arrange
        mockDataset.trendlineLinear.trendoffset = 1; // Skip the first data point
        mockDataset.data = [{ x: 5, y: 10 }, { x: 10, y: 30 }, { x: 20, y: 50 }];
        // firstIndex will be 1 + 0 = 1. So, data processing starts from dataset.data[1]
        // datasetMeta.data should reflect this for startPos calculation.
        // startPos will be datasetMeta.data[1].x
        mockDatasetMeta.data = [{x:5}, {x:10}, {x:20}]; // Original meta data
        
        mockLineFitterInstance.minx = 10; // Fitter sees {x:10}, {x:20}
        mockLineFitterInstance.maxx = 20;
        
        const yAtFitterMinX = mockLineFitterInstance.f(mockLineFitterInstance.minx); // f(10)
        const yAtFitterMaxX = mockLineFitterInstance.f(mockLineFitterInstance.maxx); // f(20)

        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => val*10);


        // Act
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        // Assert
        expect(LineFitter).toHaveBeenCalledTimes(1);
        // fitter.add should be called for data from index 1 onwards
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(2);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(10, 30); // From dataset.data[1]
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(20, 50); // From dataset.data[2]
        expect(mockLineFitterInstance.add).not.toHaveBeenCalledWith(5, 10);

        // startPos = datasetMeta.data[1].x = 10
        // endPos = datasetMeta.data[2].x = 20
        const expectedX1 = 10; 
        const expectedY1 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(yAtFitterMinX);
        const expectedX2 = 20;
        const expectedY2 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(yAtFitterMaxX);

        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({
            x1: expectedX1,
            y1: expectedY1,
            x2: expectedX2,
            y2: expectedY2,
        }));
    });

    test('Scenario 5: trendoffset (negative)', () => {
        // Arrange
        mockDataset.trendlineLinear.trendoffset = -1; // Skip the last data point effectively for fitter
        mockDataset.data = [{ x: 10, y: 30 }, { x: 20, y: 50 }, { x: 30, y: 70 }];
        // firstIndex will be (dataset.data.length) + (-1) = 3 - 1 = 2.
        // The loop for fitter.add will consider index < dataset.data.length + trendoffset (i.e. index < 2)
        // So, data points at index 0 and 1 are added.
        // datasetMeta.data for startPos (firstIndex is 2, so it's datasetMeta.data[2].x)
        // However, the internal loop `dataset.data.forEach` has `if (trendoffset < 0 && index < dataset.data.length + trendoffset) return;`
        // This means for trendoffset = -1, if index < 2, it returns. This seems to be an error in my understanding or the code.
        // Let's re-evaluate:
        // firstIndex = (negative_offset_is_less_than_zero ? dataset.data.length : 0) + trendoffset + ...
        // firstIndex = dataset.data.length + trendoffset = 3 + (-1) = 2. This is where findIndex starts.
        // The findIndex will likely return 0 if dataset.data[2] is valid. So firstIndex becomes 2.
        // startPos = datasetMeta.data[2].x
        // The loop: `if (trendoffset < 0 && index < dataset.data.length + trendoffset) return;`
        // `index < 3 + (-1)` => `index < 2`. So for index 0 and 1, it will *return* (skip add). This means only data[2] is added.

        mockDatasetMeta.data = [{x:10}, {x:20}, {x:30}];
        mockLineFitterInstance.minx = 30; // Fitter effectively sees only {x:30, y:70}
        mockLineFitterInstance.maxx = 30;
        const yAtFitterMinX = mockLineFitterInstance.f(mockLineFitterInstance.minx);
        const yAtFitterMaxX = mockLineFitterInstance.f(mockLineFitterInstance.maxx);
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => val*10);


        // Act
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        // Assert
        expect(LineFitter).toHaveBeenCalledTimes(1);
        // Due to the condition `if (trendoffset < 0 && index < dataset.data.length + trendoffset) return;`
        // index 0 (0 < 2 is true, returns)
        // index 1 (1 < 2 is true, returns)
        // index 2 (2 < 2 is false, proceeds)
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(1);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(30, 70); // Only last point based on logic
        
        // startPos = datasetMeta.data[firstIndex (which is 2)].x = 30
        // endPos = datasetMeta.data[lastIndex (which is 2)].x = 30
        const expectedX1 = 30;
        const expectedY1 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(yAtFitterMinX);
        const expectedX2 = 30;
        const expectedY2 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(yAtFitterMaxX);

        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({
            x1: expectedX1,
            y1: expectedY1,
            x2: expectedX2,
            y2: expectedY2,
        }));
    });
    
    test('Scenario 5b: trendoffset (negative) where it makes firstIndex search start beyond array bounds', () => {
        // Arrange
        mockDataset.trendlineLinear.trendoffset = -3; // Equal to data length
        mockDataset.data = [{ x: 10, y: 30 }, { x: 20, y: 50 }, { x: 30, y: 70 }];
        // firstIndex calculation: `dataset.data.length + trendoffset` = 3 + (-3) = 0.
        // `dataset.data.slice(trendoffset)` becomes `dataset.data.slice(-3)` which is the whole array.
        // `findIndex` on this slice, starting from `firstIndex` (0) should find the first valid point at index 0.
        // So `firstIndex` becomes 0.
        // `startPos` = `datasetMeta.data[0].x`.
        // Loop for fitter.add: `if (trendoffset < 0 && index < dataset.data.length + trendoffset) return;`
        // `index < 3 + (-3)` => `index < 0`. This condition is never met. So all points should be added.
        // This indicates the `trendoffset` logic might be complex. The initial `if (Math.abs(trendoffset) >= dataset.data.length) trendoffset = 0;`
        // should handle this. So trendoffset becomes 0.

        // Act
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale); // trendoffset should become 0

        // Assert
        expect(LineFitter).toHaveBeenCalledTimes(1);
        // All points should be added because trendoffset was reset to 0
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(3); 
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(10, 30);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(20, 50);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(30, 70);
    });


    test('Scenario 6: fillColor is true', () => {
        // Arrange
        mockDataset.trendlineLinear.fillColor = 'rgba(0,0,255,0.1)';
        mockLineFitterInstance.minx = 10;
        mockLineFitterInstance.maxx = 30;
        mockDatasetMeta.data = [{ x: 10 }, { x: 20 }, { x: 30 }];
        const yAtMinX = mockLineFitterInstance.f(mockLineFitterInstance.minx);
        const yAtMaxX = mockLineFitterInstance.f(mockLineFitterInstance.maxx);

        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => val*10);


        // Act
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        // Assert
        expect(drawingUtils.fillBelowTrendline).toHaveBeenCalledTimes(1);
        const expectedX1 = 10; // datasetMeta.data[0].x
        const expectedY1 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(yAtMinX);
        const expectedX2 = 30; // datasetMeta.data[2].x
        const expectedY2 = mockDatasetMeta.controller.chart.scales.y.getPixelForValue(yAtMaxX);
        
        expect(drawingUtils.fillBelowTrendline).toHaveBeenCalledWith(
            mockCtx,
            expectedX1,
            expectedY1,
            expectedX2,
            expectedY2,
            mockDatasetMeta.controller.chart.chartArea.bottom,
            mockDataset.trendlineLinear.fillColor
        );
    });

    test('Handles time scale data correctly', () => {
        mockXScale.options.type = 'timeseries';
        const date1 = new Date('2023-01-01T00:00:00.000Z');
        const date2 = new Date('2023-01-02T00:00:00.000Z');
        mockDataset.data = [
            { x: date1.toISOString(), y: 10 }, // Using xAxisKey 'x'
            { t: date2.toISOString(), y: 20 }  // Using fallback 't'
        ];
        mockDataset.trendlineLinear.xAxisKey = 'x'; // or 't' if that's the primary
        
        mockLineFitterInstance.minx = date1.getTime();
        mockLineFitterInstance.maxx = date2.getTime();
        mockDatasetMeta.data = [{ x: date1.toISOString() }, { t: date2.toISOString() }];
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => val*10);


        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(date1.getTime(), 10);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(date2.getTime(), 20);
    });
    
    test('Handles data where x or y might be missing for object-type data but not timeseries', () => {
        mockXScale.options.type = 'linear'; // Not time/timeseries
        mockDataset.data = [
            { x: 10, y: 30 },
            { x: 20 },        // y is missing
            { y: 70 },        // x is missing (should use index)
            { value: 90 }     // x and y are missing (should use index and value for y)
        ];
        // datasetMeta.data would correspond to these for start/endPos
        mockDatasetMeta.data = [{x:10, y:30}, {x:20}, {y:70}, {value:90}];
        mockLineFitterInstance.minx = 0; // Will use index for some
        mockLineFitterInstance.maxx = 3;


        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(10, 30); // Index 0
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(1, 20);  // Index 1, data.x
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(2, 70);  // Index 2, data.y
        // The fourth data point {value: 90} is tricky. The code is:
        // } else if (xy) { // xy is true if typeof dataset.data[firstIndex] === 'object'
        //     if (!isNaN(data.x) && !isNaN(data.y)) { fitter.add(data.x, data.y); } 
        //     else if (!isNaN(data.x)) { fitter.add(index, data.x); }  <-- This would be for {x: val}
        //     else if (!isNaN(data.y)) { fitter.add(index, data.y); }  <-- This would be for {y: val}
        // } else { fitter.add(index, data); }
        // If data = {value: 90}, xy is true. data.x is NaN, data.y is NaN. So it doesn't call fitter.add for this one.
        // This should be tested to confirm.
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(3);
    });


    test('Uses parsingOptions for xAxisKey and yAxisKey if specific ones are not provided', () => {
        delete mockDataset.trendlineLinear.xAxisKey;
        delete mockDataset.trendlineLinear.yAxisKey;
        mockDatasetMeta.controller.chart.options.parsing = { xAxisKey: 'customX', yAxisKey: 'customY' };
        mockDataset.data = [{ customX: 5, customY: 15 }];
        mockDatasetMeta.data = [{customX: 5}]; // For start/end pos
        
        mockLineFitterInstance.minx = 5;
        mockLineFitterInstance.maxx = 5;

        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(5, 15);
    });

});
