/** How much of a data colour (a technology's, a wavelength's) a label keeps when it is drawn in it; the rest is the
 *  theme's ink, which reads on the label halo, so the text does too by day and by night (model/contrast.test.ts). */
export const DATA_INK = 40;
/** A label's colour: a data colour (#rrggbb) mixed into the ink; a theme's own token (var(--x)) as it is. */
export const labelInk = (colour: string) => (colour.startsWith('#') ? `color-mix(in srgb, ${colour} ${DATA_INK}%, var(--ink))` : colour);
