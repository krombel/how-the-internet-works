import { defineActivity } from '$core/define';

// Watching a video: requests go up to a video server, pieces of video come back down.
export default defineActivity({
  order: 1,
  route: [{ place: 'me', default: 'home' }, { segment: 'isp-to-cdn' }],
  groups: ['internet'],
  flows: [
    {
      id: 'video',
      stack: ['ip', 'tcp', 'tls', 'http'],
      // an HTTPS connection from a random high port on the phone
      ports: { client: 51034, server: 443 },
      packets: [
        { kind: 'request', dir: 'up', pace: 1.2, colour: '#ffcf5d' },
        { kind: 'video', dir: 'down', pace: 1.3, every: 1.3, offset: 0.4, colour: '#bf6f8f' },
      ],
    },
  ],
  layout: {
    overview: {
      landscape: { nodes: { internet: [1380, 360, 250] } },
      portrait: { nodes: { internet: [610, 330, 300] } },
    },
  },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Streaming_media', title: 'Streaming media', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP', title: 'MPEG-DASH', level: 'nerd', lang: 'en' },
  ],
});
