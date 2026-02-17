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
  MAX_SAVED_LOCATIONS,
  SUGGESTED_LOCATION_LABELS,
} from '@nusa/shared';
import type { SavedLocation, MetroArea } from '@nusa/shared';

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
      <div style={pageStyles.container}>
        <div style={pageStyles.header}>
          <h1 style={pageStyles.title}>Manage Locations</h1>
          <span style={pageStyles.count}>
            {savedLocations.length} of {MAX_SAVED_LOCATIONS}
          </span>
        </div>

        {/* Location list */}
        <div style={pageStyles.list}>
          {savedLocations.map((loc) => {
            const metroDisplay = loc.metro_area
              ? `${loc.metro_area.name}, ${loc.metro_area.state}`
              : loc.metro_area_id;

            return (
              <div key={loc.id} style={pageStyles.item}>
                <div style={pageStyles.itemRow}>
                  <div style={pageStyles.starCol}>
                    {loc.is_default && <span>⭐</span>}
                  </div>
                  <div style={pageStyles.itemInfo}>
                    {editingId === loc.id ? (
                      <input
                        style={pageStyles.editInput}
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                        maxLength={30}
                      />
                    ) : (
                      <div style={pageStyles.itemLabel}>{loc.label}</div>
                    )}
                    <div style={pageStyles.itemMetro}>{metroDisplay}</div>
                  </div>
                  <div style={pageStyles.actions}>
                    {editingId !== loc.id && (
                      <button
                        style={pageStyles.iconBtn}
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
                        style={{ ...pageStyles.iconBtn, color: 'var(--color-error)' }}
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
                    style={pageStyles.setDefaultBtn}
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
        {!showAdd && savedLocations.length < MAX_SAVED_LOCATIONS && (
          <button
            style={pageStyles.addBtn}
            onClick={() => setShowAdd(true)}
          >
            ＋ Add a Location
          </button>
        )}

        {showAdd && (
          <div style={pageStyles.addSection}>
            <h3 style={{ marginBottom: 12 }}>Add a Location</h3>

            {!selectedMetro ? (
              <>
                <input
                  style={pageStyles.input}
                  placeholder="Search by metro name or ZIP code"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
                {searchResults.map((m) => (
                  <div
                    key={m.id}
                    style={pageStyles.searchResult}
                    onClick={() => {
                      setSelectedMetro(m);
                      const next = SUGGESTED_LOCATION_LABELS.find(
                        (l) => !usedLabels.includes(l.toLowerCase())
                      );
                      setNewLabel(next ?? '');
                    }}
                  >
                    {m.name}, {m.state}
                  </div>
                ))}
              </>
            ) : (
              <>
                <div style={pageStyles.selectedMetro}>
                  📍 {selectedMetro.name}, {selectedMetro.state}
                </div>
                <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                  Name this location
                </label>
                <input
                  style={pageStyles.input}
                  value={newLabel}
                  onChange={(e) => { setNewLabel(e.target.value); setAddError(''); }}
                  maxLength={30}
                  autoFocus
                />
                {addError && (
                  <div style={{ color: 'var(--color-error)', fontSize: 13, marginTop: 4 }}>
                    {addError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
                  {SUGGESTED_LOCATION_LABELS.filter(
                    (l) => !usedLabels.includes(l.toLowerCase())
                  ).map((chip) => (
                    <button
                      key={chip}
                      style={{
                        ...pageStyles.chip,
                        ...(newLabel === chip ? { background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' } : {}),
                      }}
                      onClick={() => setNewLabel(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    style={pageStyles.cancelBtn}
                    onClick={() => {
                      setShowAdd(false);
                      setSelectedMetro(null);
                      setSearchQuery('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    style={{
                      ...pageStyles.saveBtn,
                      opacity: !newLabel.trim() || saving ? 0.5 : 1,
                    }}
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

const pageStyles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 520,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  count: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
  },
  list: {
    borderTop: '1px solid var(--color-border)',
  },
  item: {
    borderBottom: '1px solid var(--color-border)',
    padding: '12px 0',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  starCol: {
    width: 24,
    textAlign: 'center' as const,
    fontSize: 14,
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: 600,
  },
  itemMetro: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    marginTop: 2,
  },
  editInput: {
    fontSize: 16,
    fontWeight: 600,
    border: 'none',
    borderBottom: '2px solid var(--color-primary)',
    outline: 'none',
    padding: '2px 0',
    width: '100%',
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 4,
  },
  setDefaultBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: 'var(--color-primary)',
    marginLeft: 32,
    marginTop: 4,
    padding: 0,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 15,
    color: 'var(--color-primary)',
    padding: '12px 0',
  },
  addSection: {
    marginTop: 16,
    padding: 16,
    border: '1px solid var(--color-border)',
    borderRadius: 8,
  },
  input: {
    width: '100%',
    height: 44,
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '0 12px',
    fontSize: 15,
    marginBottom: 8,
    outline: 'none',
  },
  searchResult: {
    padding: '10px 4px',
    borderBottom: '1px solid var(--color-border)',
    cursor: 'pointer',
    fontSize: 15,
  },
  selectedMetro: {
    padding: '8px 0',
    fontSize: 15,
    fontWeight: 600,
    borderBottom: '1px solid var(--color-border)',
    marginBottom: 12,
  },
  chip: {
    height: 30,
    padding: '0 12px',
    borderRadius: 15,
    border: '1px solid var(--color-border)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    height: 40,
    border: 'none',
    borderRadius: 8,
    background: 'var(--color-primary)',
    color: 'white',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
};
