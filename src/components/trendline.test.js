import { addFitter } from './trendline'; 
import 'jest-canvas-mock'; 

import { LineFitter } from '../utils/lineFitter';
import * as drawingUtils from '../utils/drawing';
import * as labelUtils from './label';

jest.mock('../utils/lineFitter'); 
jest.mock('../utils/drawing', () => ({
  drawTrendline: jest.fn(),
  fillBelowTrendline: jest.fn(),
  setLineStyle: jest.fn(),
}));
jest.mock('./label', () => ({ addTrendlineLabel: jest.fn() }));

describe('addFitter', () => {
    let mockCtx;
    let mockDatasetMeta;
    let mockDataset;
    let mockXScale;
    let mockYScale;
    let mockLineFitterInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLineFitterInstance = {
            add: jest.fn(),
            f: jest.fn(x => x * 2 + 1), 
            slope: jest.fn(() => 2),    
            intercept: jest.fn(() => 1),
            fo: jest.fn(() => 50), 
            scale: jest.fn(() => 1), 
            minx: undefined, 
            maxx: undefined, 
            count: 0,        
            sumx: 0, sumy: 0, sumx2: 0, sumxy: 0,
        };
        LineFitter.mockImplementation(() => mockLineFitterInstance);
        
        mockCtx = {
            save: jest.fn(), translate: jest.fn(), rotate: jest.fn(), fillText: jest.fn(),
            measureText: jest.fn(() => ({ width: 50 })), font: '', fillStyle: '',
            strokeStyle: '', lineWidth: 0, beginPath: jest.fn(), moveTo: jest.fn(),
            lineTo: jest.fn(), stroke: jest.fn(), restore: jest.fn(),
        };
        
        mockDatasetMeta = {
            controller: {
                chart: {
                    scales: { 'y': { getPixelForValue: jest.fn(val => val * 10), getValueForPixel: jest.fn(pixel => pixel / 10) } },
                    options: { parsing: { xAxisKey: 'x', yAxisKey: 'y' } },
                    chartArea: { top: 50, bottom: 450, left: 50, right: 750, width: 700, height: 400 },
                    data: { labels: [] }
                }
            },
            data: [{x:0, y:0}] 
        };
        mockXScale = {
            getPixelForValue: jest.fn(val => val * 10), 
            getValueForPixel: jest.fn(pixel => pixel / 10), 
            options: { type: 'linear' }
        };
        mockYScale = { getPixelForValue: jest.fn(val => val * 10), getValueForPixel: jest.fn(pixel => pixel / 10) };
        
        mockDataset = {
            data: [ { x: 10, y: 30 }, { x: 20, y: 50 }, { x: 30, y: 70 } ], 
            yAxisID: 'y', 
            borderColor: 'blue', borderWidth: 2,
            trendlineLinear: {
                colorMin: 'red', colorMax: 'red', width: 3, lineStyle: 'dashed',
                fillColor: false, trendoffset: 0, projection: false,
                xAxisKey: 'x', yAxisKey: 'y',
                label: { display: true, text: 'My Trend', color: 'black', offset: 5, displayValue: true, percentage: false, font: { family: 'Arial', size: 12 } }
            }
        };
    });

    test('Scenario 1: Simple linear data, no projection, no offset', () => {
        mockDatasetMeta.data = [{x:10, y:30}]; 
        mockLineFitterInstance.minx = 10; 
        mockLineFitterInstance.maxx = 30; 
        mockLineFitterInstance.count = 3;
        mockLineFitterInstance.f = jest.fn(x => {
            if (x === 10) return 21; 
            if (x === 30) return 61; 
            return 2*x+1; 
        });
        mockXScale.getPixelForValue = jest.fn(val => {
            if (val === 10) return 100; 
            if (val === 30) return 300; 
            return val*10;
        });
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => {
            if (val === 21) return 210; 
            if (val === 61) return 610; 
            return val*10;
        });
        
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(3);
        // Expecting clipped coordinates based on previous log analysis {"x1":100,"y1":210,"x2":220,"y2":450}
        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({ x1: 100, y1: 210, x2: 220, y2: 450 }));
        expect(labelUtils.addTrendlineLabel).toHaveBeenCalledTimes(1);
    });

    test('Scenario 2: Data with null or undefined values', () => {
        mockDataset.data = [ { x: 10, y: 30 }, null, { x: 20, y: 50 }, undefined, { x: 30, y: 70 } ];
        mockDatasetMeta.data = [{x:10, y:30}]; 
        mockLineFitterInstance.minx = 10; 
        mockLineFitterInstance.maxx = 30;
        mockLineFitterInstance.count = 3; 
        mockLineFitterInstance.f = jest.fn(x => (x === 10 ? 21 : (x === 30 ? 61 : 2 * x + 1)));
        mockXScale.getPixelForValue = jest.fn(val => (val === 10 ? 100 : (val === 30 ? 300 : val*10) ));
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => (val === 21 ? 210 : (val === 61 ? 610 : val*10)));
        
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(3);
        // Expecting clipped coordinates as per Scenario 1, since data and chartArea are similar enough
        // for the same clipping to occur on the unclipped (100,210)-(300,610) line.
        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({ x1: 100, y1: 210, x2: 220, y2: 450 }));
        expect(labelUtils.addTrendlineLabel).toHaveBeenCalledTimes(1);
    });

    test('Scenario 3: trendlineLinear.projection is true', () => {
        mockDataset.trendlineLinear.projection = true;
        mockDatasetMeta.data = [{x:10, y:30}]; 
        mockLineFitterInstance.count = 3; 
        mockLineFitterInstance.slope = jest.fn(() => 2); 
        mockLineFitterInstance.intercept = jest.fn(() => 1); 
        mockLineFitterInstance.f = jest.fn(x => mockLineFitterInstance.slope() * x + mockLineFitterInstance.intercept());
        
        // Expected data values for intersections based on y=2x+1 and chartArea {t:50,b:450,l:50,r:750}, scales val = px/10
        // For the filter in trendline.js: actualChartMinY = 5, actualChartMaxY = 45.
        // Valid intersection points (data values): (5,11) and (22,45)
        mockXScale.getPixelForValue = jest.fn(val => {
            if (val === 5) return 50;   
            if (val === 22) return 220; 
            return NaN; 
        });
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => {
            if (val === 11) return 110; 
            if (val === 45) return 450; 
            return NaN; 
        });
        mockXScale.getValueForPixel = jest.fn(pixel => {
            if (pixel === mockDatasetMeta.controller.chart.chartArea.left) return 5; 
            if (pixel === mockDatasetMeta.controller.chart.chartArea.right) return 75; 
            return NaN;
        });
        // This mock ensures that chartMinY/MaxY are correctly ordered for the filter
        // based on the corrected logic in trendline.js (Math.min/max of top/bottom data values)
        mockDatasetMeta.controller.chart.scales.y.getValueForPixel = jest.fn(pixel => {
            if (pixel === mockDatasetMeta.controller.chart.chartArea.top) return 5; 
            if (pixel === mockDatasetMeta.controller.chart.chartArea.bottom) return 45; 
            return NaN;
        });

        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        
        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({ x1: 50, y1: 110, x2: 220, y2: 450 }));
    });
    
    test('Scenario 3b: trendlineLinear.projection is true (negative slope)', () => {
        mockDataset.trendlineLinear.projection = true;
        mockDatasetMeta.data = [{x:10, y:30}]; 
        mockLineFitterInstance.count = 3; 
        mockLineFitterInstance.slope = jest.fn(() => -2); 
        mockLineFitterInstance.intercept = jest.fn(() => 100); 
        mockLineFitterInstance.f = jest.fn(x => mockLineFitterInstance.slope() * x + mockLineFitterInstance.intercept());
        
        // Expected data values for intersections based on y=-2x+100
        // For the filter in trendline.js: actualChartMinY = 5, actualChartMaxY = 45.
        // Valid intersection points (data values): (27.5,45) and (47.5,5)
        mockXScale.getPixelForValue = jest.fn(val => {
            if (val === 27.5) return 275;
            if (val === 47.5) return 475;
            return NaN;
        });
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => {
            if (val === 45) return 450;
            if (val === 5) return 50;
            return NaN;
        });
        mockXScale.getValueForPixel = jest.fn(pixel => (pixel === 50 ? 5 : (pixel === 750 ? 75 : NaN)));
        mockDatasetMeta.controller.chart.scales.y.getValueForPixel = jest.fn(pixel => (pixel === 50 ? 5 : (pixel === 450 ? 45 : NaN)));
        
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        
        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({ x1: 275, y1: 450, x2: 475, y2: 50 }));
    });

    test('Scenario 4: trendoffset (positive)', () => {
        mockDataset.trendlineLinear.trendoffset = 1; 
        mockDataset.data = [{ x: 5, y: 10 }, { x: 10, y: 30 }, { x: 20, y: 50 }]; 
        mockDatasetMeta.data = [{x:5, y:10}]; 
        mockLineFitterInstance.minx = 10; 
        mockLineFitterInstance.maxx = 20;
        mockLineFitterInstance.count = 2; 
        mockLineFitterInstance.f = jest.fn(x => (x === 10 ? 21 : (x === 20 ? 41 : NaN)));
        mockXScale.getPixelForValue = jest.fn(val => (val === 10 ? 100 : (val === 20 ? 200 : NaN)));
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => (val === 21 ? 210 : (val === 41 ? 410 : NaN)));
        
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(2);
        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({ x1: 100, y1: 210, x2: 200, y2: 410 }));
    });

    test('Scenario 5: trendoffset (negative)', () => {
        mockDataset.trendlineLinear.trendoffset = -1; 
        mockDataset.data = [{ x: 10, y: 30 }, { x: 20, y: 50 }, { x: 30, y: 70 }]; 
        mockDatasetMeta.data = [{x:10, y:30}]; 
        mockLineFitterInstance.minx = 10; 
        mockLineFitterInstance.maxx = 20;
        mockLineFitterInstance.count = 2; 
        mockLineFitterInstance.f = jest.fn(x => (x === 10 ? 21 : (x === 20 ? 41 : NaN)));
        mockXScale.getPixelForValue = jest.fn(val => (val === 10 ? 100 : (val === 20 ? 200 : NaN)));
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => (val === 21 ? 210 : (val === 41 ? 410 : NaN)));
        
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(2);
        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({ x1: 100, y1: 210, x2: 200, y2: 410 }));
    });
    
    test('Scenario 5b: trendoffset (negative) to exclude all but one point', () => {
        mockDataset.trendlineLinear.trendoffset = -2; 
        mockDataset.data = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]; 
        mockDatasetMeta.data = [{x:0, y:0}];
        mockLineFitterInstance.minx = 0;
        mockLineFitterInstance.maxx = 0;
        mockLineFitterInstance.count = 1; 

        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(1);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(0,0);
        expect(drawingUtils.drawTrendline).not.toHaveBeenCalled(); 
        expect(labelUtils.addTrendlineLabel).not.toHaveBeenCalled(); 
    });

    test('Scenario 5c: trendoffset (negative) where it makes firstIndex search start beyond array bounds', () => {
        mockDataset.trendlineLinear.trendoffset = -3; 
        mockDataset.data = [{ x: 10, y: 30 }, { x: 20, y: 50 }, { x: 30, y: 70 }]; 
        mockDatasetMeta.data = [{x:10, y:30}];
        mockLineFitterInstance.count = 3; 
        mockLineFitterInstance.minx = 10; 
        mockLineFitterInstance.maxx = 30; 
        mockLineFitterInstance.f = jest.fn(x => (x === 10 ? 21 : (x === 30 ? 61 : NaN))); 
        mockXScale.getPixelForValue = jest.fn(val => (val === 10 ? 100 : (val === 30 ? 300 : NaN)));
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => (val === 21 ? 210 : (val === 61 ? 610 : NaN)));
        
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale); 
        
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(3); 
        // Expect clipped coordinates based on Scenario 1's log output
        expect(drawingUtils.drawTrendline).toHaveBeenCalledWith(expect.objectContaining({ x1: 100, y1: 210, x2: 220, y2: 450 }));
    });

    test('Scenario 6: fillColor is true', () => {
        mockDataset.trendlineLinear.fillColor = 'rgba(0,0,255,0.1)';
        mockDatasetMeta.data = [{x:10, y:30}];
        mockLineFitterInstance.minx = 10; 
        mockLineFitterInstance.maxx = 30;
        mockLineFitterInstance.count = 3; 
        mockLineFitterInstance.f = jest.fn(x => (x === 10 ? 21 : (x === 30 ? 61 : NaN)));
        mockXScale.getPixelForValue = jest.fn(val => (val === 10 ? 100 : (val === 30 ? 300 : NaN)));
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => (val === 21 ? 210 : (val === 61 ? 610 : NaN)));
        
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        
        expect(drawingUtils.fillBelowTrendline).toHaveBeenCalledTimes(1);
        // Expect clipped coordinates based on Scenario 1's log output
        expect(drawingUtils.fillBelowTrendline).toHaveBeenCalledWith(
            mockCtx, 100, 210, 220, 450, 
            mockDatasetMeta.controller.chart.chartArea.bottom,
            mockDataset.trendlineLinear.fillColor
        );
    });

    test('Handles time scale data correctly', () => {
        mockXScale.options.type = 'timeseries';
        const date1 = new Date('2023-01-01T00:00:00.000Z');
        const date2 = new Date('2023-01-02T00:00:00.000Z');
        const date1Str = date1.toISOString();
        const date2Str = date2.toISOString();
        mockDataset.data = [ { x: date1Str, y: 10 }, { t: date2Str, y: 20 } ]; 
        mockDataset.trendlineLinear.xAxisKey = 'x'; 
        mockDatasetMeta.data = [{ x: date1Str, y: 10 }]; 
        
        const date1Ts = date1.getTime();
        const date2Ts = date2.getTime();
        mockLineFitterInstance.minx = date1Ts;
        mockLineFitterInstance.maxx = date2Ts;
        mockLineFitterInstance.count = 2; 
        mockLineFitterInstance.f = jest.fn(t => {
            if (t === date1Ts) return 1.0; 
            if (t === date2Ts) return 2.0; 
            return NaN;
        }); 
        mockXScale.getPixelForValue = jest.fn(t => {
            if (t === date1Ts) return 50; 
            if (t === date2Ts) return 150; 
            return NaN;
        });
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => {
            if (val === 1.0) return 10; 
            if (val === 2.0) return 20; 
            return NaN;
        });

        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(2); 
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(date1.getTime(), 10);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(date2.getTime(), 20); 
        // The line (50,10) to (150,20) is outside chartArea.top=50, so it should be clipped out.
        expect(drawingUtils.drawTrendline).not.toHaveBeenCalled(); 
    });
    
    test('Handles data where x or y might be missing for object-type data but not timeseries', () => {
        mockXScale.options.type = 'linear'; 
        mockDataset.data = [ { x: 10, y: 30 }, { x: 20 }, { y: 70 }, { value: 90 } ];
        mockDatasetMeta.data = mockDataset.data; 
        mockLineFitterInstance.count = 1; 
        mockLineFitterInstance.minx = 10; 
        mockLineFitterInstance.maxx = 10; 
        
        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(1);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(10, 30);
        expect(drawingUtils.setLineStyle).not.toHaveBeenCalled(); 
        expect(drawingUtils.drawTrendline).not.toHaveBeenCalled();
        expect(labelUtils.addTrendlineLabel).not.toHaveBeenCalled();
    });

    test('Uses parsingOptions for xAxisKey and yAxisKey if specific ones are not provided', () => {
        delete mockDataset.trendlineLinear.xAxisKey;
        delete mockDataset.trendlineLinear.yAxisKey;
        mockDatasetMeta.controller.chart.options.parsing = { xAxisKey: 'customX', yAxisKey: 'customY' };
        mockDataset.data = [{ customX: 5, customY: 15 }]; 
        mockDatasetMeta.data = [{customX: 5}]; 
        mockLineFitterInstance.count = 1; 
        mockLineFitterInstance.minx = 5;
        mockLineFitterInstance.maxx = 5;

        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);
        
        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(1); 
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(5, 15);
        expect(drawingUtils.setLineStyle).not.toHaveBeenCalled(); 
        expect(drawingUtils.drawTrendline).not.toHaveBeenCalled();
        expect(labelUtils.addTrendlineLabel).not.toHaveBeenCalled();
    });

    test('Configuration without label property (issue #118)', () => {
        // Test case for user's exact configuration that was failing
        mockDataset.trendlineLinear = {
            lineStyle: 'dotted',
            width: 2
        };
        mockDataset.data = [10, 20, 30, 40, 50];
        mockDatasetMeta.data = [10, 20, 30, 40, 50];
        mockLineFitterInstance.minx = 0;
        mockLineFitterInstance.maxx = 4;
        mockLineFitterInstance.count = 5;
        mockLineFitterInstance.f = jest.fn(x => {
            if (x === 0) return 100;
            if (x === 4) return 200;
            return x * 25 + 100;
        });
        mockXScale.getPixelForValue = jest.fn(val => {
            if (val === 0) return 100;
            if (val === 4) return 400;
            return val * 100 + 100;
        });
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => {
            if (val === 100) return 200;
            if (val === 200) return 300;
            return val * 1 + 100;
        });

        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(5);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(0, 10);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(1, 20);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(2, 30);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(3, 40);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(4, 50);
        expect(drawingUtils.setLineStyle).toHaveBeenCalledWith(mockCtx, 'dotted');
        expect(drawingUtils.drawTrendline).toHaveBeenCalled();
        expect(labelUtils.addTrendlineLabel).not.toHaveBeenCalled(); // No label should be added
    });

    test('Configuration without label property but with other properties', () => {
        // Test minimal configuration similar to issue #118
        mockDataset.trendlineLinear = {
            colorMin: 'red',
            width: 3,
            lineStyle: 'dashed'
        };
        mockDataset.data = [{ x: 10, y: 30 }, { x: 20, y: 50 }];
        mockDatasetMeta.data = [{ x: 10, y: 30 }];
        mockLineFitterInstance.minx = 10;
        mockLineFitterInstance.maxx = 20;
        mockLineFitterInstance.count = 2;
        mockLineFitterInstance.f = jest.fn(x => {
            if (x === 10) return 30;
            if (x === 20) return 50;
            return x * 2 + 10;
        });
        mockXScale.getPixelForValue = jest.fn(val => {
            if (val === 10) return 100;
            if (val === 20) return 200;
            return val * 10;
        });
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => {
            if (val === 30) return 200;
            if (val === 50) return 300;
            return val * 10;
        });

        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(2);
        expect(drawingUtils.setLineStyle).toHaveBeenCalledWith(mockCtx, 'dashed');
        expect(drawingUtils.drawTrendline).toHaveBeenCalled();
        expect(labelUtils.addTrendlineLabel).not.toHaveBeenCalled(); // No label should be added
    });

    test('Time scale with array of numbers and no label property (issue #118)', () => {
        // Test case for time scale with array data (like lineChartTypeTime.html)
        mockXScale.options.type = 'time';
        mockDataset.trendlineLinear = {
            lineStyle: 'dotted',
            width: 2
        };
        mockDataset.data = [75, 64, 52, 23, 44]; // Just numbers like in the example
        mockDatasetMeta.data = [75, 64, 52, 23, 44];
        mockDatasetMeta.controller.chart.data.labels = [
            '2025-03-01T00:00:00',
            '2025-03-02T00:00:00', 
            '2025-03-03T00:00:00',
            '2025-03-04T00:00:00',
            '2025-03-05T00:00:00'
        ];
        
        const date1 = new Date('2025-03-01T00:00:00').getTime();
        const date5 = new Date('2025-03-05T00:00:00').getTime();
        
        mockLineFitterInstance.minx = date1;
        mockLineFitterInstance.maxx = date5;
        mockLineFitterInstance.count = 5;
        mockLineFitterInstance.f = jest.fn(x => {
            if (x === date1) return 75;
            if (x === date5) return 44;
            return 50; // approximation
        });
        mockXScale.getPixelForValue = jest.fn(val => {
            if (val === date1) return 100;
            if (val === date5) return 300;
            return 200;
        });
        mockDatasetMeta.controller.chart.scales.y.getPixelForValue = jest.fn(val => {
            if (val === 75) return 200;
            if (val === 44) return 250;
            return 225;
        });

        addFitter(mockDatasetMeta, mockCtx, mockDataset, mockXScale, mockYScale);

        expect(mockLineFitterInstance.add).toHaveBeenCalledTimes(5);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(date1, 75);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(new Date('2025-03-02T00:00:00').getTime(), 64);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(new Date('2025-03-03T00:00:00').getTime(), 52);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(new Date('2025-03-04T00:00:00').getTime(), 23);
        expect(mockLineFitterInstance.add).toHaveBeenCalledWith(new Date('2025-03-05T00:00:00').getTime(), 44);
        expect(drawingUtils.setLineStyle).toHaveBeenCalledWith(mockCtx, 'dotted');
        expect(drawingUtils.drawTrendline).toHaveBeenCalled();
        expect(labelUtils.addTrendlineLabel).not.toHaveBeenCalled(); // No label should be added
    });
});
