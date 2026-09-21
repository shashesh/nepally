import React, { useCallback, useEffect, useState } from 'react';
import { Button, SegmentedControl, TextInput, Textarea } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { uploadPhotosInOrder } from '../../lib/photoUploads';
import { resizeImage } from '../../lib/resizeImage';
import { ImageUploader, ToggleChipGroup, notify, type UploaderPhoto } from '../../components/ui';
import {
  getCategories,
  getListingById,
  createListing,
  updateListing,
  uploadListingPhotos,
  createListingSchema,
  LISTING_TYPE_LABELS,
  ITEM_CONDITION_LABELS,
  ALLOWED_LISTING_PHOTO_MIME_TYPES,
  MAX_LISTING_PHOTO_BYTES,
  MAX_PHOTOS_PER_LISTING,
  type MarketplaceCategory,
  type ListingType,
  type ItemCondition,
} from '@nepally/shared';
import styles from './marketplace.module.css';

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const editId = typeof router.query.edit === 'string' ? router.query.edit : null;
  const isEditing = !!editId;

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [photos, setPhotos] = useState<UploaderPhoto[]>([]);

  // Form state
  const [listingType, setListingType] = useState<ListingType>('business');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [itemCondition, setItemCondition] = useState<ItemCondition | undefined>();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    async function init() {
      const catResult = await getCategories(supabase);
      if (catResult.data) setCategories(catResult.data);

      if (editId) {
        const result = await getListingById(supabase, editId);
        if (result.data) {
          const l = result.data;
          setListingType(l.listing_type);
          setTitle(l.title);
          setDescription(l.description);
          setCategoryId(l.category_id);
          setPrice(l.price ?? '');
          setBusinessName(l.business_name ?? '');
          setAddress(l.address ?? '');
          setPhone(l.phone ?? '');
          setEmail(l.email ?? '');
          setWebsiteUrl(l.website_url ?? '');
          setItemCondition(l.item_condition ?? undefined);
          setPhotos((l.photos ?? []).map((url: string) => ({ kind: 'stored' as const, url })));
        }
        setLoading(false);
      }
    }
    init();
  }, [editId]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user?.metro_area_id) return;

      setErrors({});

      const formData = {
        listing_type: listingType,
        title,
        description,
        category_id: categoryId,
        photos: [] as string[],
        price: price || undefined,
        business_name: businessName || undefined,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        website_url: websiteUrl || undefined,
        item_condition: itemCondition,
      };

      const validation = createListingSchema.safeParse(formData);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of validation.error.issues) {
          const path = issue.path[0]?.toString() ?? 'form';
          fieldErrors[path] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      setSubmitting(true);

      // Upload whatever is new, then read every photo back in display order.
      const uploaded = await uploadPhotosInOrder(photos, user.id, (inputs) =>
        uploadListingPhotos(supabase, inputs)
      );
      if ('error' in uploaded) {
        notify.error(uploaded.error.message);
        setSubmitting(false);
        return;
      }

      const payload = { ...formData, photos: uploaded.urls };

      if (isEditing && editId) {
        const result = await updateListing(supabase, editId, payload);
        if (result.error) {
          notify.error(result.error.message);
        } else {
          router.push('/marketplace/my-listings');
        }
      } else {
        const result = await createListing(supabase, {
          ...payload,
          owner_id: user.id,
          metro_area_id: user.metro_area_id,
        });
        if (result.error) {
          notify.error(result.error.message);
        } else {
          router.push('/marketplace');
        }
      }

      setSubmitting(false);
    },
    [
      user, listingType, title, description, categoryId, price,
      businessName, address, phone, email, websiteUrl, itemCondition,
      photos, isEditing, editId, router,
    ]
  );

  if (!user || loading) return null;

  return (
    <>
      <Head>
        <title>{isEditing ? 'Edit Listing' : 'Create Listing'} - Marketplace - Nepally</title>
      </Head>
      <div className={styles.createFormContainer}>
        <Link href="/marketplace" className={styles.backLink}>
          ← Back to Marketplace
        </Link>

        <h1 className={styles.title}>{isEditing ? 'Edit Listing' : 'Create Listing'}</h1>

        <form onSubmit={handleSubmit}>
          {/* Listing Type */}
          <div className={styles.formSection}>
            <SegmentedControl
              fullWidth
              aria-label="Listing Type"
              value={listingType}
              onChange={(value) => setListingType(value as ListingType)}
              data={(['business', 'individual'] as ListingType[]).map((type) => ({
                value: type,
                label: LISTING_TYPE_LABELS[type],
              }))}
            />
          </div>

          {/* Photos */}
          <div className={styles.formSection}>
            <ImageUploader
              photos={photos}
              onChange={setPhotos}
              max={MAX_PHOTOS_PER_LISTING}
              maxBytes={MAX_LISTING_PHOTO_BYTES}
              accept={[...ALLOWED_LISTING_PHOTO_MIME_TYPES]}
              transformFile={resizeImage}
              disabled={submitting}
              label="Photos"
            />
          </div>

          {/* Category */}
          <div className={styles.formSection}>
            <ToggleChipGroup
              label="Category *"
              mode="single"
              options={categories.map((cat) => ({
                value: cat.id,
                label: `${cat.emoji} ${cat.name}`,
                name: cat.name,
              }))}
              value={categoryId ? [categoryId] : []}
              onChange={([next]) => setCategoryId(next ?? '')}
              error={errors.category_id}
            />
          </div>

          {/* Title */}
          <div className={styles.formSection}>
            <TextInput
              label="Title *"
              placeholder="What are you listing?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              error={errors.title}
            />
          </div>

          {/* Description */}
          <div className={styles.formSection}>
            <Textarea
              label="Description *"
              placeholder="Describe your listing in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={3000}
              minRows={4}
              error={errors.description}
            />
          </div>

          {/* Price */}
          <div className={styles.formSection}>
            <TextInput
              label="Price / Rate (optional)"
              placeholder='e.g., "$50/hr", "Free", "Contact for pricing"'
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* Business fields */}
          {listingType === 'business' && (
            <>
              <div className={styles.formSection}>
                <TextInput
                  label="Business Name *"
                  placeholder="Your business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  error={errors.business_name}
                />
              </div>
              <div className={styles.formSection}>
                <TextInput
                  label="Address (optional)"
                  placeholder="Business address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className={styles.formSection}>
                <TextInput
                  label="Website (optional)"
                  placeholder="https://..."
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Individual fields */}
          {listingType === 'individual' && (
            <div className={styles.formSection}>
              <SegmentedControl
                fullWidth
                aria-label="Condition"
                value={itemCondition ?? ''}
                onChange={(value) => setItemCondition(value as ItemCondition)}
                data={(['new', 'used'] as ItemCondition[]).map((condition) => ({
                  value: condition,
                  label: ITEM_CONDITION_LABELS[condition],
                }))}
              />
            </div>
          )}

          {/* Contact */}
          <div className={styles.formSection}>
            <TextInput
              label="Phone (optional)"
              placeholder="Contact phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className={styles.formSection}>
            <TextInput
              label="Email (optional)"
              placeholder="Contact email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
          </div>

          <Button type="submit" fullWidth size="md" loading={submitting} mt="md">
            {isEditing ? 'Update Listing' : 'Create Listing'}
          </Button>
        </form>
      </div>
    </>
  );
}
