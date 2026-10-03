import { defineTechnology } from '$core/define';

export default defineTechnology({
  look: 'trunk',
  colour: '#9a6b45',
  stack: ['ethernet', 'mpls'],
  dive: 'fibre-light',
  // a 100 Gbit/s wavelength
  rate: { down: 100e9, up: 100e9 },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Internet_backbone', title: 'Internet backbone', level: 'both', lang: 'en' },
  ],
});
