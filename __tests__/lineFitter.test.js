import { LineFitter } from '../src/classes/lineFitter.js';

describe('LineFitter', () => {
    let lineFitter;

    beforeEach(() => {
        lineFitter = new LineFitter();
    });

    it('adds a point to the fitter', () => {
        lineFitter.add(1, 2);
        expect(lineFitter.count).toBe(1);
        expect(lineFitter.sumX).toBe(1);
        expect(lineFitter.sumX2).toBe(1);
        expect(lineFitter.sumXY).toBe(2);
        expect(lineFitter.sumY).toBe(2);
        expect(lineFitter.minx).toBe(1);
        expect(lineFitter.maxx).toBe(1);
        expect(lineFitter.maxy).toBe(2);
    });

    it('initializes count to 0', () => {
        expect(lineFitter.count).toBe(0);
    });

    it('initializes sumX to 0', () => {
        expect(lineFitter.sumX).toBe(0);
    });

    it('initializes sumX2 to 0', () => {
        expect(lineFitter.sumX2).toBe(0);
    });

    it('initializes sumXY to 0', () => {
        expect(lineFitter.sumXY).toBe(0);
    });

    it('initializes sumY to 0', () => {
        expect(lineFitter.sumY).toBe(0);
    });

    it('initializes minx to Infinity', () => {
        expect(lineFitter.minx).toBe(1e100);
    });

    it('initializes maxx to -Infinity', () => {
        expect(lineFitter.maxx).toBe(-1e100);
    });

    it('initializes maxy to -Infinity', () => {
        expect(lineFitter.maxy).toBe(-1e100);
    });
});
