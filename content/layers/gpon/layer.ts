import { defineLayer } from '$core/define';

export default defineLayer({
  fields: [
    { id: 'pli', bits: 12, value: '{payload}', use: true },
    // every house on the splitter hears everything going down; each ONT only keeps its own port
    { id: 'port', bits: 12, value: '1127', use: true, kid: true },
    { id: 'pti', bits: 3, value: '001 (last fragment)' },
    { id: 'hec', bits: 13, value: '{sum}', use: true },
  ],
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/GPON', title: 'GPON', level: 'nerd', lang: 'en' },
  ],
});
