import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@mantine/core';
import { IconLayoutGrid, IconLock, IconPlus } from '@tabler/icons-react';
import type { User } from '@nepally/shared';
import {
  FOOTER_LINKS,
  getCommunityLinks,
  getCreateLink,
  getTopicLinks,
  isSectionActive,
  type NavIcon,
} from './navItems';
import styles from './SideRail.module.css';

const DOT_CLASS: Record<string, string> = {
  housing: styles.dotHousing,
  jobs: styles.dotJobs,
  help: styles.dotHelp,
  question: styles.dotQuestion,
  discussion: styles.dotDiscussion,
  emergency: styles.dotEmergency,
};

interface RailLinkProps {
  href: string;
  label: string;
  active: boolean;
  icon?: NavIcon;
  dotSlug?: string;
}

function RailLink({ href, label, active, icon: Icon, dotSlug }: RailLinkProps) {
  return (
    <Link href={href} className={styles.link} aria-current={active ? 'page' : undefined} title={label}>
      {Icon ? (
        <Icon size={18} aria-hidden="true" />
      ) : (
        <span className={`${styles.dot} ${DOT_CLASS[dotSlug ?? ''] ?? ''}`} aria-hidden="true" />
      )}
      <span className={styles.label}>{label}</span>
    </Link>
  );
}

/** Full rail at ≥62em; icon-only between 48em and 62em; hidden on phones (AppShell). */
export function SideRail({ user }: { user: User }) {
  const router = useRouter();
  const activeTag = typeof router.query.tags === 'string' ? router.query.tags : null;
  const create = getCreateLink(user);
  const canPost = user.trust_level >= 1;

  return (
    <nav aria-label="Primary" className={styles.root}>
      <div className={styles.section}>
        <RailLink href="/feed" label="Feed" icon={IconLayoutGrid} active={isSectionActive(router.pathname, '/feed') && !activeTag} />
      </div>

      <div className={styles.section}>
        <p className={styles.heading}>Topics</p>
        {getTopicLinks().map((topic) => (
          <RailLink key={topic.slug} href={topic.href} label={topic.label} dotSlug={topic.slug} active={activeTag === topic.slug} />
        ))}
      </div>

      <div className={styles.section}>
        <p className={styles.heading}>Community</p>
        {getCommunityLinks(user).map((link) => (
          <RailLink key={link.key} href={link.href} label={link.label} icon={link.icon} active={isSectionActive(router.pathname, link.href)} />
        ))}
      </div>

      <Button
        component={Link}
        href={create.href}
        variant={canPost ? 'filled' : 'default'}
        leftSection={canPost ? <IconPlus size={16} aria-hidden="true" /> : <IconLock size={16} aria-hidden="true" />}
        className={styles.cta}
        fullWidth
      >
        <span className={styles.label}>{create.label}</span>
      </Button>

      <footer className={styles.footer}>
        {FOOTER_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={styles.footerLink}>
            {link.label}
          </Link>
        ))}
      </footer>
    </nav>
  );
}
