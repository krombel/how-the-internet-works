import { defineTechnology } from '$core/define';

export default defineTechnology({
  look: 'cable',
  colour: '#e78d44',
  stack: ['ethernet'],
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Ethernet', title: 'Ethernet', level: 'both', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/Ethernet', title: 'Ethernet', level: 'both', lang: 'da' },
  ],
});
