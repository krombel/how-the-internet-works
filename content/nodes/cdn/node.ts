import { defineNode } from '$core/define';

// The cache server in the video company's data centre; its dive opens it up: the app in its container, the cache
// (a hit, or a miss that goes back to the origin) and the disks the video lives on
export default defineNode({
  kind: 'device',
  role: 'endpoint',
  dive: 'server-inside',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Content_delivery_network', title: 'Content delivery network', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Web_cache', title: 'Web cache', level: 'nerd', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Cache_(computing)', title: 'Cache (computing)', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Virtual_machine', title: 'Virtual machine', level: 'nerd', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/OS-level_virtualization', title: 'OS-level virtualization', level: 'nerd', lang: 'en' },
  ],
});
