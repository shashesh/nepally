import { describe, expect, it } from 'vitest';
import {
  getCommunityLinks,
  getCreateLink,
  getSettingsLinks,
  getTabLinks,
  getTopicLinks,
  isSectionActive,
  isTaskRoute,
} from './navItems';

describe('navItems', () => {
  it('treats composers and message threads as task routes', () => {
    expect(isTaskRoute('/posts/create')).toBe(true);
    expect(isTaskRoute('/messages/[id]')).toBe(true);
    expect(isTaskRoute('/messages')).toBe(false);
    expect(isTaskRoute('/feed')).toBe(false);
  });

  it('matches sections by prefix and treats / as the feed', () => {
    expect(isSectionActive('/', '/feed')).toBe(true);
    expect(isSectionActive('/events/[id]', '/events')).toBe(true);
    expect(isSectionActive('/eventsx', '/events')).toBe(false);
    expect(isSectionActive('/profile/locations', '/profile')).toBe(true);
  });

  it('links every sidebar topic to a feed filter', () => {
    expect(getTopicLinks()[0]).toEqual({ slug: 'housing', label: 'Housing', href: '/feed?tags=housing' });
  });

  it('only shows Moderation to moderators', () => {
    expect(getCommunityLinks({ is_moderator: false }).map((link) => link.label)).toEqual(['Events', 'Marketplace']);
    expect(getCommunityLinks({ is_moderator: true }).map((link) => link.label)).toContain('Moderation');
    expect(getSettingsLinks({ is_moderator: false }).map((link) => link.label)).not.toContain('Moderation');
  });

  it('sends Level 0 members to verification instead of the composer', () => {
    expect(getCreateLink({ trust_level: 0 })).toEqual({ label: 'Verify to post', href: '/profile' });
    expect(getCreateLink({ trust_level: 1 })).toEqual({ label: 'Create post', href: '/posts/create' });
  });

  it('has five tabs in the native-app order', () => {
    expect(getTabLinks({ trust_level: 1 }).map((tab) => tab.key)).toEqual(['home', 'events', 'create', 'marketplace', 'profile']);
  });
});
