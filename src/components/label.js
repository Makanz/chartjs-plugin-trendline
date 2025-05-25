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
export const addTrendlineLabel = (
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