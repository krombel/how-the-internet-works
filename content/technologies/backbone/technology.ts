import { defineTechnology } from '$core/define';

export default defineTechnology({
  look: 'trunk',
  colour: '#9a6b45',
  stack: ['ethernet', 'mpls'],
  dive: 'fibre-light',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Internet_backbone', title: 'Internet backbone', level: 'both', lang: 'en' },
  ],
});
