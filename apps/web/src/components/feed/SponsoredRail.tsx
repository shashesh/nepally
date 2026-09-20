import React from 'react';
import Link from 'next/link';
import { Button } from '@mantine/core';
import type { Event, SponsoredListing } from '@nepally/shared';
import styles from './SponsoredRail.module.css';

/** Placeholder cards shown in markets with no paid listings yet. */
const PLACEHOLDER_ADS = [
  {
    id: 'biz-1',
    title: 'Himalayan Kitchen',
    description: 'Authentic Nepali cuisine in the heart of your city. Order online or dine in!',
    cta: 'Visit Website',
    label: 'AD',
    href: '#',
  },
  {
    id: 'biz-2',
    title: 'Nepal Travel Co.',
    description: 'Book affordable flights to Kathmandu. Special diaspora fares available now.',
    cta: 'Learn More',
    label: 'AD',
    href: '#',
  },
];

/** Date blocks rotate through the avatar tones, which are contrast-checked pairs. */
const DATE_TONES = [styles.tone1, styles.tone2, styles.tone3, styles.tone4, styles.tone5];

const DESCRIPTION_LIMIT = 100;

export interface SponsoredRailProps {
  stickyListings: SponsoredListing[];
  events: Event[];
}

/** The feed's right-hand column: paid listings above what is coming up locally. */
export function SponsoredRail({ stickyListings, events }: SponsoredRailProps) {
  const ads =
    stickyListings.length > 0
      ? stickyListings.map((sticky) => ({
          id: sticky.id,
          title: sticky.listing.title,
          description: sticky.listing.description?.slice(0, DESCRIPTION_LIMIT) || '',
          cta: 'View Listing',
          label: 'Sponsored',
          href: `/marketplace/listing/${sticky.listing.id}`,
        }))
      : PLACEHOLDER_ADS;

  return (
    <aside className={styles.root}>
      <h2 className={styles.sectionTitle}>Sponsored</h2>
      <div className={styles.list}>
        {ads.map((ad) => (
          <article key={ad.id} className={styles.adCard}>
            <div className={styles.adImage}>
              <span className={styles.adLabel}>{ad.label}</span>
            </div>
            <div className={styles.adBody}>
              <h3 className={styles.adTitle}>{ad.title}</h3>
              <p className={styles.adText}>{ad.description}</p>
              <Button component={Link} href={ad.href} variant="subtle" size="compact-sm">
                {ad.cta}
              </Button>
            </div>
          </article>
        ))}
      </div>

      {events.length > 0 && (
        <div className={styles.events}>
          <div className={styles.eventsHeader}>
            <h2 className={styles.sectionTitle}>Upcoming Events</h2>
            <Link href="/events" className={styles.viewAll}>
              View All
            </Link>
          </div>
          <div className={styles.list}>
            {events.map((event, index) => {
              const date = new Date(event.start_date);
              return (
                <Link key={event.id} href={`/events/${event.id}`} className={styles.eventCard}>
                  <span className={`${styles.eventDate} ${DATE_TONES[index % DATE_TONES.length]}`}>
                    <span className={styles.eventMonth}>
                      {date.toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className={styles.eventDay}>{date.getDate().toString().padStart(2, '0')}</span>
                  </span>
                  <span className={styles.eventInfo}>
                    <span className={styles.eventName}>{event.title}</span>
                    <span className={styles.eventLocation}>{event.location_name}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
