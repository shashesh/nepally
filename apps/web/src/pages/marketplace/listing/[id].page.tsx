import React, { useCallback, useEffect } from 'react';
import { Anchor, Badge, Breadcrumbs } from '@mantine/core';
import { IconBuildingStore } from '@tabler/icons-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../../hooks/useAuth';
import { useNow } from '../../../hooks/useNow';
import { useListingDetail } from '../../../hooks/useListingDetail';
import { supabase } from '../../../lib/supabase';
import {
  incrementListingContacts,
  getListingHighlights,
  getDaysSinceRefresh,
  LISTING_TYPE_LABELS,
  ITEM_CONDITION_LABELS,
  type User,
} from '@nepally/shared';
import Avatar from '../../../components/Avatar';
import { EmptyState, ErrorState, LoadingState, PhotoCarousel } from '../../../components/ui';
import { themeSlug } from '../../../components/marketplace/categoryTheme';
import { ListingActionsPanel } from '../../../components/marketplace/ListingActionsPanel';
import { ListingBusinessDetails } from '../../../components/marketplace/ListingBusinessDetails';
import styles from './listingDetail.module.css';

export default function ListingDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const id = typeof router.query.id === 'string' ? router.query.id : undefined;

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;
  // The Pages Router keeps this page mounted from one listing to the next, so
  // key the view by id: the photo on screen starts from the first one again.
  return <ListingDetailView key={id ?? ''} id={id} viewer={user} />;
}

interface ListingDetailViewProps {
  id: string | undefined;
  viewer: Pick<User, 'id'>;
}

function ListingDetailView({ id, viewer }: ListingDetailViewProps) {
  const router = useRouter();
  const now = useNow();
  const detail = useListingDetail(id, viewer);
  const { listing } = detail;

  const handleContact = useCallback(async () => {
    if (!listing?.owner || !id) return;
    await incrementListingContacts(supabase, id);
    router.push(`/messages?to=${listing.owner.id}`);
  }, [listing, id, router]);

  if (detail.loading) {
    return (
      <div className={styles.container}>
        <LoadingState variant="detail" label="Loading listing…" />
      </div>
    );
  }

  if (detail.error) {
    return (
      <div className={styles.container}>
        <ErrorState
          title="Couldn't load this listing"
          message={detail.error}
          onRetry={detail.reload}
        />
      </div>
    );
  }

  if (detail.notFound || !listing) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon={<IconBuildingStore size={40} />}
          title="Listing not found"
          description="It may have been removed by its owner."
          action={<Anchor component={Link} href="/marketplace">Back to Marketplace</Anchor>}
        />
      </div>
    );
  }

  const isOwner = viewer.id === listing.owner_id;
  const daysAgo = getDaysSinceRefresh(listing.refreshed_at, now);
  const highlights = getListingHighlights(listing, now);
  const slug = themeSlug(listing.category?.slug);

  const actions = (
    <ListingActionsPanel
      listing={listing}
      isOwner={isOwner}
      isSaved={detail.isSaved}
      saving={detail.saving}
      onContact={handleContact}
      onToggleSave={detail.toggleSave}
    />
  );

  return (
    <>
      <Head>
        <title>{listing.title} - Marketplace - Nepally</title>
      </Head>
      <div className={styles.container} data-category={slug}>
        <Breadcrumbs className={styles.breadcrumbs} separator="›">
          <Anchor component={Link} href="/marketplace" className={styles.crumb}>
            Marketplace
          </Anchor>
          {listing.category && (
            <Anchor component={Link} href={`/marketplace/${listing.category.slug}`} className={styles.crumb}>
              {listing.category.name}
            </Anchor>
          )}
          <span className={styles.crumbCurrent}>{listing.title}</span>
        </Breadcrumbs>

        <div className={styles.layout}>
          <div className={styles.main}>
            {listing.photos.length > 0 && (
              <PhotoCarousel photos={listing.photos} alt={listing.title} />
            )}

            <section className={styles.section}>
              <h1 className={styles.title}>{listing.title}</h1>

              <div className={styles.badges}>
                {listing.category && (
                  <Badge variant="default" size="sm" radius="xl" className={styles.categoryBadge}>
                    <span aria-hidden="true">{listing.category.emoji}</span>{' '}
                    {listing.category.name}
                  </Badge>
                )}
                <Badge variant="default" size="sm" radius="xl">
                  {LISTING_TYPE_LABELS[listing.listing_type]}
                </Badge>
                {listing.item_condition && (
                  <Badge variant="default" size="sm" radius="xl">
                    {ITEM_CONDITION_LABELS[listing.item_condition]}
                  </Badge>
                )}
              </div>

              {highlights.length > 0 && (
                <ul className={styles.highlights}>
                  {highlights.map((chip) => (
                    <li
                      key={chip.key}
                      className={styles.highlight}
                      data-open={chip.key === 'open_now' ? '' : undefined}
                    >
                      <span aria-hidden="true">{chip.icon}</span>
                      {chip.value}
                    </li>
                  ))}
                </ul>
              )}

              <div className={styles.inlineActions}>{actions}</div>

              <p className={styles.description}>{listing.description}</p>
            </section>

            {listing.listing_type === 'business' && (
              <section className={styles.section} aria-labelledby="listing-business">
                <h2 id="listing-business" className={styles.sectionTitle}>
                  Business Details
                </h2>
                <ListingBusinessDetails listing={listing} />
              </section>
            )}

            {listing.owner && (
              <section className={styles.section} aria-labelledby="listing-owner">
                <h2 id="listing-owner" className={styles.sectionTitle}>
                  Posted by
                </h2>
                <div className={styles.owner}>
                  <Avatar
                    name={listing.owner.full_name}
                    photoUrl={listing.owner.profile_photo}
                    trustLevel={listing.owner.trust_level}
                    size="medium"
                    decorative
                  />
                  <div>
                    <p className={styles.ownerName}>{listing.owner.full_name}</p>
                    <p className={styles.ownerMeta}>
                      {daysAgo === 0 ? 'Refreshed today' : `Refreshed ${daysAgo}d ago`}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <p className={styles.stats}>
              <span>{listing.views_count} views</span>
              <span>{listing.saves_count} saves</span>
            </p>
          </div>

          <aside className={styles.sidebar} aria-label="Listing actions">
            {actions}
          </aside>
        </div>
      </div>
    </>
  );
}
