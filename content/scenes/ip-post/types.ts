// Props of the IP dive's own art (art/*.svelte). A different look can swap these files; the maths stays in post.ts.
export interface ParcelProps {
  x: number;
  /** Ground level under the parcel. */
  y: number;
  colour: string;
  /** The link envelope it travels in: `lift` 0 = on, 1 = taken off (gone). */
  wrap: { colour: string; lift: number } | null;
  /** The next link envelope going on: `drop` 0 = not yet, 1 = on. */
  next: { colour: string; drop: number } | null;
  walking: boolean;
  time: number;
}
export interface CardProps { x: number; y: number; w: number; h: number; tint: string }
export interface SignProps { x: number; y: number; w: number; h: number; to: 'back' | 'on' | 'side'; lit: number }
export interface LensProps { x: number; y: number; r: number; time: number }
