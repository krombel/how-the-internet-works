// The place picker's pictures (PlacePicker.svelte): one device per place, loaded before the picker opens (#91).
import { content } from '../model/registry';

/** A place's picture: the first device after the start (Wi-Fi box, cell tower, …). */
export const iconOf = (id: string) => {
  const hops = content.places[id].hops.filter((h) => 'at' in h) as { at: string; node?: string }[];
  const h = hops[1] ?? hops[0];
  return h.node ?? h.at;
};
/** Every picture the picker may show (one per place). */
export const pictures = () => [...new Set(Object.keys(content.places).map(iconOf))];
