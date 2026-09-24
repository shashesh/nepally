import React from 'react';
import Link from 'next/link';
import { Button, Group } from '@mantine/core';
import {
  IconBriefcase,
  IconBuildingStore,
  IconCalendarEvent,
  IconHeartHandshake,
  IconHome,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import styles from './LandingPage.module.css';

interface Feature {
  title: string;
  description: string;
  Icon: TablerIcon;
}

/** Not links: every area sits behind sign-in, so the page's only way in is Sign up or Log in. */
const FEATURES: Feature[] = [
  { title: 'Housing', description: 'Rooms, roommates and rentals from people near you.', Icon: IconHome },
  { title: 'Jobs', description: 'Openings and referrals shared by the community.', Icon: IconBriefcase },
  { title: 'Help', description: 'Ask for a hand, or offer one, when it matters.', Icon: IconHeartHandshake },
  { title: 'Events', description: 'Festivals, pujas and meetups in your area.', Icon: IconCalendarEvent },
  { title: 'Marketplace', description: 'Local businesses and services run by Nepalis.', Icon: IconBuildingStore },
];

/** What a signed-out visitor sees at `/`: who Nepally is for, and the way in. */
export function LandingPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="landing-title">
        <span className={styles.rule} aria-hidden="true" />
        <h1 id="landing-title" className={styles.title}>
          Welcome to Nepally
        </h1>
        <p className={styles.lead}>The Nepali community in the USA, organized by where you live.</p>
        <Group gap="sm" className={styles.actions}>
          <Button component={Link} href="/signup" size="md">
            Sign up
          </Button>
          <Button component={Link} href="/login" variant="default" size="md">
            Log in
          </Button>
        </Group>
      </section>

      <section className={styles.features} aria-labelledby="landing-features">
        <h2 id="landing-features" className={styles.sectionTitle}>
          What you&apos;ll find
        </h2>
        <ul className={styles.featureList}>
          {FEATURES.map(({ title, description, Icon }) => (
            <li key={title} className={styles.feature}>
              <span className={styles.icon}>
                <Icon size={20} stroke={1.75} aria-hidden="true" />
              </span>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureText}>{description}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className={styles.closing}>
        Nepally works because neighbors look out for each other. Before you post, read the{' '}
        <Link href="/guidelines" className={styles.inlineLink}>
          Community Guidelines
        </Link>
        .
      </p>
    </div>
  );
}
