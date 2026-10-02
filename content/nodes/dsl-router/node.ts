import { defineNode } from '$core/define';

// A home router with a DSL modem inside, for the phone line: routes and NATs like the fibre one, then speaks tones.
export default defineNode({
  kind: 'device',
  role: 'nat',
  dive: 'router-inside',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/DSL_modem', title: 'DSL modem', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Network_address_translation', title: 'Network address translation', level: 'nerd', lang: 'en' },
  ],
});
