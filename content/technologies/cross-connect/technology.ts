import { defineTechnology } from '$core/define';

// A short fibre between two networks' boxes in the same building (an exchange's data centre): the cable that joins them
export default defineTechnology({
  look: 'fibre',
  colour: '#d39b1e',
  stack: ['ethernet'],
  dive: 'fibre-light',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Meet-me_room', title: 'Meet-me room', level: 'nerd', lang: 'en' },
  ],
});
