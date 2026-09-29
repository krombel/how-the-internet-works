import { defineTechnology } from '$core/define';

export default defineTechnology({
  look: 'radio',
  colour: '#72b8a5',
  stack: ['wifi'],
  dive: 'wifi-radio',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Wi-Fi', title: 'Wi-Fi', level: 'both', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/Wi-Fi', title: 'Wi-Fi', level: 'both', lang: 'da' },
    { url: 'https://en.wikipedia.org/wiki/Orthogonal_frequency-division_multiplexing', title: 'OFDM', level: 'nerd', lang: 'en' },
  ],
});
