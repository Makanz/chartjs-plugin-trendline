import { getScales, setLineStyle, drawTrendline, fillBelowTrendline } from './drawing';

describe('getScales', () => {
  it('should correctly identify x and y scales', () => {
    const mockChartInstance = {
      scales: {
        x: { isHorizontal: () => true, id: 'x-axis' },
        y: { isHorizontal: () => false, id: 'y-axis' },
      },
    };
    const { xScale, yScale } = getScales(mockChartInstance);
    expect(xScale.id).toBe('x-axis');
    expect(yScale.id).toBe('y-axis');
  });

  it('should handle missing y scale', () => {
    const mockChartInstance = {
      scales: {
        x: { isHorizontal: () => true, id: 'x-axis' },
      },
    };
    const { xScale, yScale } = getScales(mockChartInstance);
    expect(xScale.id).toBe('x-axis');
    expect(yScale).toBeUndefined();
  });

  it('should handle missing x scale', () => {
    const mockChartInstance = {
      scales: {
        y: { isHorizontal: () => false, id: 'y-axis' },
      },
    };
    const { xScale, yScale } = getScales(mockChartInstance);
    expect(xScale).toBeUndefined();
    expect(yScale.id).toBe('y-axis');
  });

  it('should handle multiple scales of the same orientation (uses the last one found)', () => {
    const mockChartInstance = {
      scales: {
        x1: { isHorizontal: () => true, id: 'x-axis-1' },
        x2: { isHorizontal: () => true, id: 'x-axis-2' },
        y: { isHorizontal: () => false, id: 'y-axis' },
      },
    };
    const { xScale, yScale } = getScales(mockChartInstance);
    expect(['x-axis-1', 'x-axis-2']).toContain(xScale.id);
    expect(yScale.id).toBe('y-axis');
  });
  
  it('should handle multiple y-scales and no x-scale (uses the last one found for y)', () => {
    const mockChartInstance = {
      scales: {
        y1: { isHorizontal: () => false, id: 'y-axis-1' },
        y2: { isHorizontal: () => false, id: 'y-axis-2' },
      },
    };
    const { xScale, yScale } = getScales(mockChartInstance);
    expect(xScale).toBeUndefined();
    expect(['y-axis-1', 'y-axis-2']).toContain(yScale.id);
  });


  it('should handle an empty scales object', () => {
    const mockChartInstance = {
      scales: {},
    };
    const { xScale, yScale } = getScales(mockChartInstance);
    expect(xScale).toBeUndefined();
    expect(yScale).toBeUndefined();
  });
});

describe('setLineStyle', () => {
  let mockCtx;

  beforeEach(() => {
    mockCtx = {
      setLineDash: jest.fn(),
    };
  });

  it('should set dotted line style', () => {
    setLineStyle(mockCtx, 'dotted');
    expect(mockCtx.setLineDash).toHaveBeenCalledWith([2, 2]);
  });

  it('should set dashed line style', () => {
    setLineStyle(mockCtx, 'dashed');
    expect(mockCtx.setLineDash).toHaveBeenCalledWith([8, 3]);
  });

  it('should set dashdot line style', () => {
    setLineStyle(mockCtx, 'dashdot');
    expect(mockCtx.setLineDash).toHaveBeenCalledWith([8, 3, 2, 3]);
  });

  it('should set solid line style', () => {
    setLineStyle(mockCtx, 'solid');
    expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
  });

  it('should default to solid line style for undefined input', () => {
    setLineStyle(mockCtx, undefined);
    expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
  });

  it('should default to solid line style for unknown input', () => {
    setLineStyle(mockCtx, 'unknownStyle');
    expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
  });
});

describe('drawTrendline', () => {
  let mockCtx;
  let mockGradient;
  let consoleWarnSpy;

  beforeEach(() => {
    mockGradient = {
      addColorStop: jest.fn(),
    };
    mockCtx = {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      closePath: jest.fn(),
      createLinearGradient: jest.fn().mockReturnValue(mockGradient),
      strokeStyle: '', // Initialize, will be set by the function
    };
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks(); 
  });

  it('should draw a trendline with valid parameters and gradient', () => {
    const params = { ctx: mockCtx, x1: 0, y1: 10, x2: 100, y2: 110, colorMin: 'red', colorMax: 'blue' };
    drawTrendline(params);

    expect(mockCtx.beginPath).toHaveBeenCalledTimes(1);
    expect(mockCtx.moveTo).toHaveBeenCalledWith(params.x1, params.y1);
    expect(mockCtx.lineTo).toHaveBeenCalledWith(params.x2, params.y2);
    expect(mockCtx.createLinearGradient).toHaveBeenCalledWith(params.x1, params.y1, params.x2, params.y2);
    expect(mockGradient.addColorStop).toHaveBeenCalledTimes(2);
    expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, params.colorMin);
    expect(mockGradient.addColorStop).toHaveBeenCalledWith(1, params.colorMax);
    expect(mockCtx.strokeStyle).toBe(mockGradient);
    expect(mockCtx.stroke).toHaveBeenCalledTimes(1);
    expect(mockCtx.closePath).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should warn and not draw if coordinates are non-finite', () => {
    const params = { ctx: mockCtx, x1: Infinity, y1: 10, x2: 100, y2: 110, colorMin: 'red', colorMax: 'blue' };
    drawTrendline(params);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot draw trendline: coordinates contain non-finite values',
        { x1: Infinity, y1: 10, x2: 100, y2: 110 }
    );
    expect(mockCtx.beginPath).not.toHaveBeenCalled();
    expect(mockCtx.moveTo).not.toHaveBeenCalled();
    expect(mockCtx.lineTo).not.toHaveBeenCalled();
    expect(mockCtx.stroke).not.toHaveBeenCalled();
    expect(mockCtx.closePath).not.toHaveBeenCalled();
    expect(mockCtx.createLinearGradient).not.toHaveBeenCalled();
  });

  it('should warn and use fallback color if gradient creation fails', () => {
    mockCtx.createLinearGradient.mockImplementation(() => {
      throw new Error('Test gradient error');
    });
    const params = { ctx: mockCtx, x1: 0, y1: 10, x2: 100, y2: 110, colorMin: 'red', colorMax: 'blue' };
    drawTrendline(params);
    
    expect(consoleWarnSpy).toHaveBeenCalledWith('Gradient creation failed, using solid color:', expect.any(Error));
    expect(mockCtx.strokeStyle).toBe(params.colorMin);
    expect(mockCtx.beginPath).toHaveBeenCalledTimes(1);
    expect(mockCtx.moveTo).toHaveBeenCalledWith(params.x1, params.y1);
    expect(mockCtx.lineTo).toHaveBeenCalledWith(params.x2, params.y2);
    expect(mockCtx.stroke).toHaveBeenCalledTimes(1);
    expect(mockCtx.closePath).toHaveBeenCalledTimes(1);
  });
});

describe('fillBelowTrendline', () => {
  let mockCtx;
  let consoleWarnSpy;

  beforeEach(() => {
    mockCtx = {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      fillStyle: '', // Initialize, will be set by the function
    };
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should fill below trendline with valid parameters', () => {
    const x1 = 0, y1 = 10, x2 = 100, y2 = 110, drawBottom = 200, fillColor = 'rgba(0,0,255,0.1)';
    fillBelowTrendline(mockCtx, x1, y1, x2, y2, drawBottom, fillColor);

    expect(mockCtx.beginPath).toHaveBeenCalledTimes(1);
    expect(mockCtx.moveTo).toHaveBeenCalledWith(x1, y1);
    expect(mockCtx.lineTo).toHaveBeenNthCalledWith(1, x2, y2);
    expect(mockCtx.lineTo).toHaveBeenNthCalledWith(2, x2, drawBottom);
    expect(mockCtx.lineTo).toHaveBeenNthCalledWith(3, x1, drawBottom);
    expect(mockCtx.lineTo).toHaveBeenNthCalledWith(4, x1, y1);
    expect(mockCtx.lineTo).toHaveBeenCalledTimes(4);
    expect(mockCtx.closePath).toHaveBeenCalledTimes(1);
    expect(mockCtx.fillStyle).toBe(fillColor);
    expect(mockCtx.fill).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should warn and not fill if coordinates or drawBottom are non-finite', () => {
    const x1 = 0, y1 = 10, x2 = 100, y2 = Infinity, drawBottom = 200, fillColor = 'rgba(0,0,255,0.1)';
    fillBelowTrendline(mockCtx, x1, y1, x2, y2, drawBottom, fillColor);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Cannot fill below trendline: coordinates contain non-finite values',
      { x1, y1, x2, y2: Infinity, drawBottom }
    );
    expect(mockCtx.beginPath).not.toHaveBeenCalled();
    expect(mockCtx.moveTo).not.toHaveBeenCalled();
    expect(mockCtx.lineTo).not.toHaveBeenCalled();
    expect(mockCtx.closePath).not.toHaveBeenCalled();
    expect(mockCtx.fill).not.toHaveBeenCalled();
  });

   it('should warn and not fill if drawBottom is non-finite', () => {
    const x1 = 0, y1 = 10, x2 = 100, y2 = 110, drawBottom = Infinity, fillColor = 'rgba(0,0,255,0.1)';
    fillBelowTrendline(mockCtx, x1, y1, x2, y2, drawBottom, fillColor);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Cannot fill below trendline: coordinates contain non-finite values',
      { x1, y1, x2, y2, drawBottom: Infinity }
    );
    expect(mockCtx.beginPath).not.toHaveBeenCalled();
    expect(mockCtx.moveTo).not.toHaveBeenCalled();
    expect(mockCtx.lineTo).not.toHaveBeenCalled();
    expect(mockCtx.closePath).not.toHaveBeenCalled();
    expect(mockCtx.fill).not.toHaveBeenCalled();
  });
});
