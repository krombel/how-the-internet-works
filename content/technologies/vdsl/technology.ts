import { defineTechnology } from '$core/define';

// The old copper phone line from the home to a DSLAM in the street cabinet, carrying Ethernet frames as DMT tones
// (VDSL2, PTM) above the band of a phone call.
export default defineTechnology({
  look: 'cable',
  colour: '#8d6cc4',
  stack: ['ethernet'],
  dive: 'dsl-tones',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Digital_subscriber_line', title: 'DSL', level: 'both', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/DSL', title: 'DSL', level: 'both', lang: 'da' },
    { url: 'https://en.wikipedia.org/wiki/VDSL', title: 'VDSL', level: 'nerd', lang: 'en' },
  ],
});
