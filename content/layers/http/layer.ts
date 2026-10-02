import { defineLayer } from '$core/define';

export default defineLayer({
  fields: [
    { id: 'start', value: { up: 'GET /video/720p/42.m4s HTTP/1.1', down: 'HTTP/1.1 200 OK' }, use: ['endpoint'], kid: { up: '@ask', down: '@send' } },
    { id: 'header', value: { up: 'Host: video.example', down: 'Content-Type: video/mp4' }, use: ['endpoint'] },
  ],
  // the rest of the headers, and this packet's share of the body
  bytes: { up: 360, down: 1300 },
  openAt: ['endpoint'],
  dive: 'http-chunk',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/HTTP', title: 'HTTP', level: 'both', lang: 'en' },
  ],
});
