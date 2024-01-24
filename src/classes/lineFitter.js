export class LineFitter {
    constructor() {
        this.count = 0;
        this.sumX = 0;
        this.sumX2 = 0;
        this.sumXY = 0;
        this.sumY = 0;
        this.minx = 1e100;
        this.maxx = -1e100;
        this.maxy = -1e100;
    }

    add = (x, y) => {
        x = parseFloat(x);
        y = parseFloat(y);

        this.count++;
        this.sumX += x;
        this.sumX2 += x * x;
        this.sumXY += x * y;
        this.sumY += y;
        if (x < this.minx) this.minx = x;
        if (x > this.maxx) this.maxx = x;
        if (y > this.maxy) this.maxy = y;
    };

    f = (x) => {
        x = parseFloat(x);

        let det = this.count * this.sumX2 - this.sumX * this.sumX;
        let offset = (this.sumX2 * this.sumY - this.sumX * this.sumXY) / det;
        let scale = (this.count * this.sumXY - this.sumX * this.sumY) / det;
        return offset + x * scale;
    };

    fo = () => {
        let det = this.count * this.sumX2 - this.sumX * this.sumX;
        let offset = (this.sumX2 * this.sumY - this.sumX * this.sumXY) / det;
        let scale = (this.count * this.sumXY - this.sumX * this.sumY) / det;

        // Get x when y = 0
        let xo = -offset / scale;
        return xo;
    };

    scale = () => {
        let det = this.count * this.sumX2 - this.sumX * this.sumX;
        let scale = (this.count * this.sumXY - this.sumX * this.sumY) / det;

        return scale;
    };
}
