import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import {
  getListingById,
  saveListing,
  unsaveListing,
  getUserSavedListingIds,
  incrementListingViews,
  incrementListingContacts,
  LISTING_TYPE_LABELS,
  ITEM_CONDITION_LABELS,
  BUSINESS_HOURS_DAYS,
  type MarketplaceListing,
} from '@nepally/shared';
import styles from '../marketplace.module.css';

const CATEGORY_THEME_CLASS_BY_SLUG: Record<string, string> = {
  'food-restaurants': styles.categoryThemeFoodRestaurants,
  'grocery-specialty': styles.categoryThemeGrocerySpecialty,
  'professional-services': styles.categoryThemeProfessionalServices,
  'immigration-legal': styles.categoryThemeImmigrationLegal,
  'remittance-finance': styles.categoryThemeRemittanceFinance,
  'health-wellness': styles.categoryThemeHealthWellness,
  'education-tutoring': styles.categoryThemeEducationTutoring,
  transportation: styles.categoryThemeTransportation,
  'home-services': styles.categoryThemeHomeServices,
  'beauty-wellness': styles.categoryThemeBeautyWellness,
  'cultural-services': styles.categoryThemeCulturalServices,
  other: styles.categoryThemeOther,
};

export default function ListingDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { id: listingId } = router.query;

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    async function fetchData() {
      if (!router.isReady || !listingId || typeof listingId !== 'string') return;

      const listingResult = await getListingById(supabase, listingId);
      if (listingResult.data) {
        setListing(listingResult.data);
        incrementListingViews(supabase, listingId);
      }

      if (user) {
        const savedResult = await getUserSavedListingIds(supabase, user.id);
        if (savedResult.data) {
          setIsSaved(savedResult.data.includes(listingId));
        }
      }

      setLoading(false);
    }
    fetchData();
  }, [listingId, user, router.isReady]);

  const handleSave = useCallback(async () => {
    if (typeof listingId !== 'string') return;
    setSaving(true);
    if (isSaved) {
      const result = await unsaveListing(supabase, listingId);
      if (!result.error) setIsSaved(false);
    } else {
      const result = await saveListing(supabase, listingId);
      if (!result.error) setIsSaved(true);
    }
    setSaving(false);
  }, [isSaved, listingId]);

  const handleContact = useCallback(async () => {
    if (!listing?.owner || typeof listingId !== 'string') return;
    await incrementListingContacts(supabase, listingId);
    router.push(`/messages?to=${listing.owner.id}`);
  }, [listing, listingId, router]);

  if (!user) return null;

  if (loading) {
    return (
      <div className={styles.detailContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className={styles.detailContainer}>
        <Link href="/marketplace" className={styles.backLink}>← Back to Marketplace</Link>
        <p>Listing not found.</p>
      </div>
    );
  }

  const isOwner = user.id === listing.owner_id;
  const daysAgo = Math.floor(
    (Date.now() - new Date(listing.refreshed_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const categoryThemeClass = CATEGORY_THEME_CLASS_BY_SLUG[listing.category?.slug ?? ''] ?? styles.categoryThemeOther;

  return (
    <>
      <Head>
        <title>{listing.title} - Marketplace - Nepally</title>
      </Head>
      <div className={`${styles.detailContainer} ${categoryThemeClass}`}>
        <Link href="/marketplace" className={styles.backLink}>← Back to Marketplace</Link>

        {/* Photo gallery */}
        {listing.photos.length > 0 && (
          <div className={styles.photoGallery}>
            <Image
              src={listing.photos[photoIndex]}
              alt={`${listing.title} photo ${photoIndex + 1}`}
              className={styles.mainPhoto}
              fill
            />
            {listing.photos.length > 1 && (
              <>
                <button
                  type="button"
                  className={styles.galleryPrev}
                  onClick={() => setPhotoIndex((i) => (i - 1 + listing.photos.length) % listing.photos.length)}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.galleryNext}
                  onClick={() => setPhotoIndex((i) => (i + 1) % listing.photos.length)}
                  aria-label="Next photo"
                >
                  ›
                </button>
                <div className={styles.galleryIndicator}>
                  {photoIndex + 1} / {listing.photos.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Main content */}
        <div className={styles.detailSection}>
          <h1 className={styles.detailTitle}>{listing.title}</h1>
          {listing.price && <div className={styles.detailPrice}>{listing.price}</div>}

          <div className={styles.listingMeta}>
            <span className={styles.badge}>
              {listing.category?.emoji} {listing.category?.name}
            </span>
            <span className={styles.badgeType}>
              {LISTING_TYPE_LABELS[listing.listing_type]}
            </span>
            {listing.item_condition && (
              <span className={styles.badgeType}>
                {ITEM_CONDITION_LABELS[listing.item_condition]}
              </span>
            )}
          </div>

          <p className={styles.detailDescription}>{listing.description}</p>
        </div>

        {/* Business details */}
        {listing.listing_type === 'business' && (
          <div className={styles.detailSection}>
            <h3 className={styles.sectionTitle}>Business Details</h3>
            {listing.business_name && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Business:</span>
                <span className={styles.detailValue}>{listing.business_name}</span>
              </div>
            )}
            {listing.address && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Address:</span>
                <span className={styles.detailValue}>{listing.address}</span>
              </div>
            )}
            {listing.phone && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Phone:</span>
                <span className={styles.detailValue}>{listing.phone}</span>
              </div>
            )}
            {listing.email && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email:</span>
                <span className={styles.detailValue}>{listing.email}</span>
              </div>
            )}
            {listing.website_url && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Website:</span>
                <span className={styles.detailValue}>{listing.website_url}</span>
              </div>
            )}
            {listing.business_hours && (
              <>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Hours:</span>
                </div>
                {BUSINESS_HOURS_DAYS.map((day) => {
                  const hours = listing.business_hours?.[day];
                  if (!hours) return null;
                  return (
                    <div key={day} className={styles.businessHourRow}>
                      <span className={styles.detailLabel}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </span>
                      <span className={styles.detailValue}>{hours.open} - {hours.close}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Owner */}
        {listing.owner && (
          <div className={styles.detailSection}>
            <h3 className={styles.sectionTitle}>Posted by</h3>
            <div className={styles.ownerRow}>
              <div className={styles.ownerAvatar}>
                {listing.owner.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className={styles.ownerName}>{listing.owner.full_name}</div>
                <div className={styles.ownerMeta}>
                  {daysAgo === 0 ? 'Refreshed today' : `Refreshed ${daysAgo}d ago`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className={styles.listingStats}>
          <span>{listing.views_count} views</span>
          <span>{listing.saves_count} saves</span>
        </div>

        {/* Actions */}
        {!isOwner && (
          <div className={styles.actionBar}>
            <Button
              variant={isSaved ? 'filled' : 'outline'}
              onClick={handleSave}
              loading={saving}
            >
              {isSaved ? '✓ Saved' : 'Save'}
            </Button>
            <Button onClick={handleContact}>
              Contact Seller
            </Button>
          </div>
        )}

        {isOwner && (
          <div className={styles.actionBar}>
            <Link href={`/marketplace/create?edit=${listing.id}`}>
              <Button variant="outline">Edit Listing</Button>
            </Link>
            <Link href={`/marketplace/listing/promote/${listing.id}`}>
              <Button>Promote</Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
