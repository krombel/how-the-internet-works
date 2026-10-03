import { defineTechnology } from '$core/define';

export default defineTechnology({
  look: 'fibre',
  colour: '#3aaea1',
  stack: ['gpon'],
  dive: 'fibre-light',
  // a 1000/1000 plan (XGS-PON's 10 Gbit/s each way is shared by the homes on one splitter)
  rate: { down: 1e9, up: 1e9 },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Fiber_to_the_x', title: 'Fibre to the home', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/10G-PON', title: 'XGS-PON', level: 'nerd', lang: 'en' },
  ],
});
