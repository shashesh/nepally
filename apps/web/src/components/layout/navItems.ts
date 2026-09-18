import type { ComponentType } from 'react';
import {
  IconCalendarEvent,
  IconHome,
  IconPlus,
  IconShieldCheck,
  IconShoppingBag,
  IconUser,
} from '@tabler/icons-react';
import { SIDEBAR_TAGS } from '@nepally/shared';
import type { User } from '@nepally/shared';

export type NavIcon = ComponentType<{ size?: number; stroke?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;

export interface NavLinkItem {
  key: string;
  label: string;
  href: string;
  icon: NavIcon;
}

/** Full-screen task routes; the bottom tab bar would cover their input bars. */
export const TASK_ROUTES = [
  '/posts/create',
  '/marketplace/create',
  '/events/create',
  '/messages/[id]',
  '/marketplace/listing/promote/[id]',
];

export function isTaskRoute(pathname: string): boolean {
  return TASK_ROUTES.includes(pathname);
}

export function isSectionActive(pathname: string, href: string): boolean {
  if (href === '/feed') return pathname === '/' || pathname === '/feed';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getTopicLinks(): Array<{ slug: string; label: string; href: string }> {
  return SIDEBAR_TAGS.map((tag) => ({ slug: tag.slug, label: tag.name, href: `/feed?tags=${tag.slug}` }));
}

export function getCommunityLinks(user: Pick<User, 'is_moderator'>): NavLinkItem[] {
  const links: NavLinkItem[] = [
    { key: 'events', label: 'Events', href: '/events', icon: IconCalendarEvent },
    { key: 'marketplace', label: 'Marketplace', href: '/marketplace', icon: IconShoppingBag },
  ];
  if (user.is_moderator) {
    links.push({ key: 'moderation', label: 'Moderation', href: '/moderation', icon: IconShieldCheck });
  }
  return links;
}

export function getCreateLink(user: Pick<User, 'trust_level'>): { label: string; href: string } {
  return user.trust_level >= 1
    ? { label: 'Create post', href: '/posts/create' }
    : { label: 'Verify to post', href: '/profile' };
}

/** Phone tabs, mirroring the native app: Home · Events · Create · Market · Profile. */
export function getTabLinks(user: Pick<User, 'trust_level'>): NavLinkItem[] {
  const create = getCreateLink(user);
  return [
    { key: 'home', label: 'Home', href: '/feed', icon: IconHome },
    { key: 'events', label: 'Events', href: '/events', icon: IconCalendarEvent },
    { key: 'create', label: create.label, href: create.href, icon: IconPlus },
    { key: 'marketplace', label: 'Market', href: '/marketplace', icon: IconShoppingBag },
    { key: 'profile', label: 'Profile', href: '/profile', icon: IconUser },
  ];
}

/** Secondary destinations listed on the Profile page ("Settings & more"). */
export function getSettingsLinks(user: Pick<User, 'is_moderator'>): Array<{ label: string; href: string }> {
  return [
    { label: 'Locations', href: '/profile/locations' },
    { label: 'Notification settings', href: '/profile/notifications' },
    ...(user.is_moderator ? [{ label: 'Moderation', href: '/moderation' }] : []),
    { label: 'Guidelines', href: '/guidelines' },
    { label: 'Help Center', href: '/help' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ];
}

export const FOOTER_LINKS: Array<{ label: string; href: string }> = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Guidelines', href: '/guidelines' },
  { label: 'Help Center', href: '/help' },
];
