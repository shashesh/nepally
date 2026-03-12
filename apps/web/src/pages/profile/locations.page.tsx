import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../lib/supabase';
import {
  updateSavedLocation,
  deleteSavedLocation,
  setDefaultSavedLocation,
  addSavedLocation,
  searchMetroAreas,
  getMetroByZip,
  isValidZipCode,
  MAX_SAVED_LOCATIONS_PREMIUM,
  SUGGESTED_LOCATION_LABELS,
} from '@nusa/shared';
import type { SavedLocation, MetroArea } from '@nusa/shared';
import styles from '../../styles/ManageLocations.module.css';

export default function ManageLocationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { savedLocations, refreshSavedLocations } = useLocation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [showAdd, setShowAdd] = useState(router.query.add === 'true');

  // Add location state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MetroArea[]>([]);
  const [selectedMetro, setSelectedMetro] = useState<MetroArea | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) {
    router.replace('/login');
    return null;
  }

  const usedLabels = savedLocations.map((l) => l.label.toLowerCase());

  async function handleSearch(query: string) {
    setSearchQuery(query);
    setAddError('');
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    if (isValidZipCode(query)) {
      const result = await getMetroByZip(supabase, query);
      setSearchResults(result.data ? [result.data] : []);
    } else {
      const result = await searchMetroAreas(supabase, query);
      setSearchResults(result.data ?? []);
    }
  }

  async function handleSaveNew() {
    if (!selectedMetro || !user) return;
    const trimmed = newLabel.trim();
    if (!trimmed) {
      setAddError('Please enter a name.');
      return;
    }
    if (usedLabels.includes(trimmed.toLowerCase())) {
      setAddError(`You already have a location named "${trimmed}".`);
      return;
    }

    setSaving(true);
    const result = await addSavedLocation(supabase, user.id, selectedMetro.id, trimmed);
    setSaving(false);

    if (result.error) {
      setAddError(result.error.message);
    } else {
      await refreshSavedLocations();
      setShowAdd(false);
      setSelectedMetro(null);
      setSearchQuery('');
      setNewLabel('');
    }
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const trimmed = editingLabel.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const isDuplicate = savedLocations.some(
      (l) => l.id !== editingId && l.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      alert(`You already have a location named "${trimmed}".`);
      return;
    }
    await updateSavedLocation(supabase, editingId, { label: trimmed });
    setEditingId(null);
    await refreshSavedLocations();
  }

  async function handleDelete(loc: SavedLocation) {
    if (loc.is_default || savedLocations.length <= 1) return;
    if (!confirm(`Remove "${loc.label}"?`)) return;
    await deleteSavedLocation(supabase, loc.id);
    await refreshSavedLocations();
  }

  async function handleSetDefault(loc: SavedLocation) {
    if (!user) return;
    await setDefaultSavedLocation(supabase, user.id, loc.id);
    await refreshSavedLocations();
  }

  return (
    <>
      <Head>
        <title>Manage Locations - NUSA</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Manage Locations</h1>
          <span className={styles.count}>
            {savedLocations.length} of {MAX_SAVED_LOCATIONS_PREMIUM}
          </span>
        </div>

        {/* Location list */}
        <div className={styles.list}>
          {savedLocations.map((loc) => {
            const metroDisplay = loc.metro_area
              ? `${loc.metro_area.name}, ${loc.metro_area.state}`
              : loc.metro_area_id;

            return (
              <div key={loc.id} className={styles.item}>
                <div className={styles.itemRow}>
                  <div className={styles.starCol}>
                    {loc.is_default && <span>⭐</span>}
                  </div>
                  <div className={styles.itemInfo}>
                    {editingId === loc.id ? (
                      <input
                        type="text"
                        className={styles.editInput}
                        aria-label={`Rename location ${loc.label}`}
                        title={`Rename location ${loc.label}`}
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                        maxLength={30}
                      />
                    ) : (
                      <div className={styles.itemLabel}>{loc.label}</div>
                    )}
                    <div className={styles.itemMetro}>{metroDisplay}</div>
                  </div>
                  <div className={styles.actions}>
                    {editingId !== loc.id && (
                      <button
                        className={styles.iconBtn}
                        onClick={() => {
                          setEditingId(loc.id);
                          setEditingLabel(loc.label);
                        }}
                        title="Rename"
                      >
                        ✏️
                      </button>
                    )}
                    {!loc.is_default && savedLocations.length > 1 && (
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => handleDelete(loc)}
                        title="Remove"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                {!loc.is_default && (
                  <button
                    className={styles.setDefaultBtn}
                    onClick={() => handleSetDefault(loc)}
                  >
                    Set as default
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add location */}
        {!showAdd && savedLocations.length < MAX_SAVED_LOCATIONS_PREMIUM && (
          <button
            className={styles.addBtn}
            onClick={() => setShowAdd(true)}
          >
            ＋ Add a Location
          </button>
        )}

        {showAdd && (
          <div className={styles.addSection}>
            <h3 className={styles.addSectionTitle}>Add a Location</h3>

            {!selectedMetro ? (
              <>
                <input
                  type="text"
                  className={styles.input}
                  aria-label="Search by metro name or ZIP code"
                  title="Search by metro name or ZIP code"
                  placeholder="Search by metro name or ZIP code"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
                {searchResults.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={styles.searchResult}
                    onClick={() => {
                      setSelectedMetro(m);
                      const next = SUGGESTED_LOCATION_LABELS.find(
                        (l) => !usedLabels.includes(l.toLowerCase())
                      );
                      setNewLabel(next ?? '');
                    }}
                  >
                    {m.name}, {m.state}
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className={styles.selectedMetro}>
                  📍 {selectedMetro.name}, {selectedMetro.state}
                </div>
                <label htmlFor="new-location-label" className={styles.label}>
                  Name this location
                </label>
                <input
                  id="new-location-label"
                  type="text"
                  className={styles.input}
                  value={newLabel}
                  onChange={(e) => { setNewLabel(e.target.value); setAddError(''); }}
                  maxLength={30}
                  autoFocus
                />
                {addError && (
                  <div className={styles.addError}>
                    {addError}
                  </div>
                )}
                <div className={styles.chips}>
                  {SUGGESTED_LOCATION_LABELS.filter(
                    (l) => !usedLabels.includes(l.toLowerCase())
                  ).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className={`${styles.chip} ${newLabel === chip ? styles.chipSelected : ''}`}
                      onClick={() => setNewLabel(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <div className={styles.actionsRow}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => {
                      setShowAdd(false);
                      setSelectedMetro(null);
                      setSearchQuery('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.saveBtn}
                    onClick={handleSaveNew}
                    disabled={!newLabel.trim() || saving}
                  >
                    {saving ? 'Saving...' : 'Save Location'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
