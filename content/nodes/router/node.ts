import { defineNode } from '$core/define';

export default defineNode({
  kind: 'device',
  role: 'nat',
  dive: 'router-inside',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Residential_gateway', title: 'Home router', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Network_address_translation', title: 'Network address translation', level: 'nerd', lang: 'en' },
  ],
});
