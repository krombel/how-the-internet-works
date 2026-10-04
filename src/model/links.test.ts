import { describe, expect, it } from 'vitest';
import type { LearnMore } from '../define';
import { pickLinks } from './links';

const link = (url: string, more: Partial<LearnMore> = {}): LearnMore => ({ url: `https://${url}`, title: url, level: 'both', lang: 'en', ...more });

describe('learn-more links (pickLinks)', () => {
  it('shows a link for every era, or only in the eras it names (#180)', () => {
    const all = [link('tcp'), link('rfc9293', { eras: ['today'] }), link('rfc793', { eras: ['1995', '2010'] })];
    const urls = (era: string) => pickLinks(all, era, 'en', 'nerd').map((l) => l.title);
    expect(urls('today')).toEqual(['tcp', 'rfc9293']);
    expect(urls('1995')).toEqual(['tcp', 'rfc793']);
    expect(urls('2010')).toEqual(['tcp', 'rfc793']);
  });

  it('picks the reader’s level and language first, keeps English nerd links, and stops at the most', () => {
    const all = [link('en-kid', { level: 'kid' }), link('en-nerd', { level: 'nerd' }), link('da', { lang: 'da' }), link('en-both')];
    expect(pickLinks(all, 'today', 'da', 'nerd').map((l) => l.title)).toEqual(['da', 'en-nerd']);
    expect(pickLinks(all, 'today', 'en', 'kid').map((l) => l.title)).toEqual(['en-kid', 'en-both']);
    expect(pickLinks(all, 'today', 'en', 'nerd', 1).map((l) => l.title)).toEqual(['en-nerd']);
  });
});
