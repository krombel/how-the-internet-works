import { defineTechnology } from '$core/define';

// A short fibre between two networks' boxes in the same building (an exchange's data centre): the cable that joins them
export default defineTechnology({
  look: 'fibre',
  colour: '#d39b1e',
  stack: ['ethernet'],
  dive: 'fibre-light',
  // 100 Gbit/s ports
  rate: { down: 100e9, up: 100e9 },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Meet-me_room', title: 'Meet-me room', level: 'nerd', lang: 'en' },
  ],
});
