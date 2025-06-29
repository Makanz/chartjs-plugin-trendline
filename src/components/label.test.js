import { addTrendlineLabel } from './label';
import 'jest-canvas-mock'; // Ensures canvas context is mocked

describe('addTrendlineLabel', () => {
    let mockCtx;

    beforeEach(() => {
        // Reset the mock before each test
        mockCtx = {
            save: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn(),
            fillText: jest.fn(),
            measureText: jest.fn(() => ({ width: 100 })), // Mock measureText to return a fixed width
            font: '',
            fillStyle: '',
            restore: jest.fn(),
        };
    });

    // Define mock data directly as it's used in the function signature
    const mockLabel = 'Test Label';
    const mockX1 = 10;
    const mockY1 = 20;
    const mockX2 = 110;
    const mockY2 = 120;
    const mockAngle = Math.PI / 4; // 45 degrees
    const mockLabelColor = 'red';
    const mockFamily = 'Arial';
    const mockSize = 12;
    const mockOffset = 5;


    test('should correctly set label text and style', () => {
        addTrendlineLabel(
            mockCtx,
            mockLabel,
            mockX1, mockY1, mockX2, mockY2,
            mockAngle,
            mockLabelColor,
            mockFamily,
            mockSize,
            mockOffset
        );

        expect(mockCtx.fillText).toHaveBeenCalledWith(mockLabel, expect.any(Number), expect.any(Number));
        expect(mockCtx.measureText).toHaveBeenCalledWith(mockLabel);
        expect(mockCtx.font).toBe(`${mockSize}px ${mockFamily}`);
        expect(mockCtx.fillStyle).toBe(mockLabelColor);
    });

    test('should correctly apply transformations and positioning', () => {
        addTrendlineLabel(
            mockCtx,
            mockLabel,
            mockX1, mockY1, mockX2, mockY2,
            mockAngle,
            mockLabelColor,
            mockFamily,
            mockSize,
            mockOffset
        );

        const midX = (mockX1 + mockX2) / 2;
        const midY = (mockY1 + mockY2) / 2;
        expect(mockCtx.translate).toHaveBeenCalledWith(midX, midY);
        expect(mockCtx.rotate).toHaveBeenCalledWith(mockAngle);

        const labelWidth = mockCtx.measureText(mockLabel).width; // From mockCtx setup
        const adjustedX = -labelWidth / 2;
        // The original implementation uses offset directly, not negated
        const adjustedY = mockOffset;
        expect(mockCtx.fillText).toHaveBeenCalledWith(mockLabel, adjustedX, adjustedY);
    });

    test('should save and restore canvas state', () => {
        addTrendlineLabel(
            mockCtx,
            mockLabel,
            mockX1, mockY1, mockX2, mockY2,
            mockAngle,
            mockLabelColor,
            mockFamily,
            mockSize,
            mockOffset
        );

        expect(mockCtx.save).toHaveBeenCalledTimes(1);
        expect(mockCtx.restore).toHaveBeenCalledTimes(1);
        // We can infer call order by checking if save was called and restore was called.
        // For more specific ordering, a more complex mock or spy setup would be needed,
        // or checking the order of calls on the mock object if the testing library supports it.
        // For now, checking they were called is sufficient given the function's structure.
    });

    test('should handle zero offset correctly', () => {
        const currentOffset = 0;
        addTrendlineLabel(
            mockCtx,
            mockLabel,
            mockX1, mockY1, mockX2, mockY2,
            mockAngle,
            mockLabelColor,
            mockFamily,
            mockSize,
            currentOffset // Using zero offset
        );
        
        const labelWidth = mockCtx.measureText(mockLabel).width;
        const adjustedX = -labelWidth / 2;
        const adjustedY = currentOffset; // y is the offset itself
        expect(mockCtx.fillText).toHaveBeenCalledWith(mockLabel, adjustedX, adjustedY);
    });

    test('should handle different angle correctly', () => {
        const currentAngle = Math.PI / 2; // 90 degrees
        addTrendlineLabel(
            mockCtx,
            mockLabel,
            mockX1, mockY1, mockX2, mockY2,
            currentAngle, // Using different angle
            mockLabelColor,
            mockFamily,
            mockSize,
            mockOffset
        );
        expect(mockCtx.rotate).toHaveBeenCalledWith(currentAngle);
    });
});
