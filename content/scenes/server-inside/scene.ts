import { defineScene } from '$core/define';

export default defineScene({
  explains: 'node',
  learnMore: [
    { url: 'https://simple.wikipedia.org/wiki/Server_(computing)', title: 'Server', level: 'kid', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Content_delivery_network', title: 'Content delivery network', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Cache_(computing)', title: 'Cache (computing)', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Virtual_machine', title: 'Virtual machine', level: 'nerd', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/OS-level_virtualization', title: 'OS-level virtualization', level: 'nerd', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/Server', title: 'Server', level: 'both', lang: 'da' },
  ],
});
