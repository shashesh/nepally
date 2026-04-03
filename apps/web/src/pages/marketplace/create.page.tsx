import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, TextInput, Textarea } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  getCategories,
  getListingById,
  createListing,
  updateListing,
  uploadListingPhotos,
  createListingSchema,
  LISTING_TYPE_LABELS,
  ITEM_CONDITION_LABELS,
  MAX_PHOTOS_PER_LISTING,
  type MarketplaceCategory,
  type ListingType,
  type ItemCondition,
  type ListingPhotoUploadInput,
} from '@nepally/shared';
import styles from './marketplace.module.css';

type NewPhotoWeb = {
  previewUrl: string;
  fileData: ArrayBuffer;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
};

async function resizeImageFile(file: File): Promise<NewPhotoWeb> {
  const bitmap = await createImageBitmap(file);
  const MAX_WIDTH = 1200;
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Failed to process image')); return; }
      blob.arrayBuffer().then((buf) => {
        resolve({
          previewUrl: URL.createObjectURL(blob),
          fileData: buf,
          mimeType: 'image/jpeg',
          sizeBytes: buf.byteLength,
          fileName: file.name,
        });
      }).catch(reject);
    }, 'image/jpeg', 0.8);
  });
}

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const editId = typeof router.query.edit === 'string' ? router.query.edit : null;
  const isEditing = !!editId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Photo state
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhotoWeb[]>([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);

  const totalPhotos = existingPhotoUrls.length + newPhotos.length;

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
          setExistingPhotoUrls(l.photos ?? []);
        }
        setLoading(false);
      }
    }
    init();
  }, [editId]);

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [newPhotos]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS_PER_LISTING - totalPhotos;
    const toProcess = files.slice(0, remaining);

    setProcessingPhotos(true);
    const processed: NewPhotoWeb[] = [];

    for (const file of toProcess) {
      try {
        const photo = await resizeImageFile(file);
        processed.push(photo);
      } catch {
        // Skip photos that fail to process
      }
    }

    setNewPhotos((prev) => [...prev, ...processed]);
    setProcessingPhotos(false);

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [totalPhotos]);

  const handleRemoveExisting = useCallback((index: number) => {
    setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveNew = useCallback((index: number) => {
    setNewPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

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

      // Upload new photos first
      let allPhotoUrls = [...existingPhotoUrls];
      if (newPhotos.length > 0) {
        const uploadInputs: ListingPhotoUploadInput[] = newPhotos.map((p) => ({
          user_id: user.id,
          file_data: p.fileData,
          mime_type: p.mimeType,
          size_bytes: p.sizeBytes,
          file_name: p.fileName,
        }));
        const uploadResult = await uploadListingPhotos(supabase, uploadInputs);
        if (uploadResult.error) {
          alert(uploadResult.error.message);
          setSubmitting(false);
          return;
        }
        allPhotoUrls = [...allPhotoUrls, ...(uploadResult.urls ?? [])];
      }

      const payload = { ...formData, photos: allPhotoUrls };

      if (isEditing && editId) {
        const result = await updateListing(supabase, editId, payload);
        if (result.error) {
          alert(result.error.message);
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
          alert(result.error.message);
        } else {
          router.push('/marketplace');
        }
      }

      setSubmitting(false);
    },
    [
      user, listingType, title, description, categoryId, price,
      businessName, address, phone, email, websiteUrl, itemCondition,
      existingPhotoUrls, newPhotos, isEditing, editId, router,
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
            <label className={styles.formLabel}>Listing Type</label>
            <div className={styles.toggleGroup}>
              {(['business', 'individual'] as ListingType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`${styles.toggleButton} ${listingType === type ? styles.toggleButtonActive : ''}`}
                  onClick={() => setListingType(type)}
                >
                  {LISTING_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className={styles.formSection}>
            <label className={styles.formLabel}>
              Photos (up to {MAX_PHOTOS_PER_LISTING})
            </label>
            <div className={styles.photoPreviewGrid}>
              {/* Existing photos (edit mode) */}
              {existingPhotoUrls.map((url, index) => (
                <div key={`existing-${index}`} className={styles.photoThumb}>
                  <Image src={url} alt="" className={styles.photoThumbImg} fill />
                  <button
                    type="button"
                    className={styles.photoRemoveBtn}
                    onClick={() => handleRemoveExisting(index)}
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
              {/* New photos */}
              {newPhotos.map((photo, index) => (
                <div key={`new-${index}`} className={styles.photoThumb}>
                  <Image src={photo.previewUrl} alt="" className={styles.photoThumbImg} fill />
                  <button
                    type="button"
                    className={styles.photoRemoveBtn}
                    onClick={() => handleRemoveNew(index)}
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
              {/* Add photo button */}
              {totalPhotos < MAX_PHOTOS_PER_LISTING && (
                <button
                  type="button"
                  className={styles.addPhotoBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processingPhotos}
                >
                  {processingPhotos ? '...' : (
                    <>
                      <span className={styles.addPhotoIcon}>📷</span>
                      <span className={styles.addPhotoText}>Add Photo</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className={styles.hiddenFileInput}
              aria-label="Upload listing photos"
            />
            <p className={styles.photoHint}>{totalPhotos}/{MAX_PHOTOS_PER_LISTING} photos</p>
          </div>

          {/* Category */}
          <div className={styles.formSection}>
            <label className={styles.formLabel}>Category *</label>
            <div className={styles.categoryChips}>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.categoryChip} ${categoryId === cat.id ? styles.categoryChipActive : ''}`}
                  onClick={() => setCategoryId(cat.id)}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
            {errors.category_id && <p className={styles.errorText}>{errors.category_id}</p>}
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
              <label className={styles.formLabel}>Condition</label>
              <div className={styles.toggleGroup}>
                {(['new', 'used'] as ItemCondition[]).map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    className={`${styles.toggleButton} ${itemCondition === condition ? styles.toggleButtonActive : ''}`}
                    onClick={() => setItemCondition(condition)}
                  >
                    {ITEM_CONDITION_LABELS[condition]}
                  </button>
                ))}
              </div>
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
