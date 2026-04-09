import { useState, useEffect } from 'react';
import { getCategories, type MarketplaceCategory } from '@nepally/shared';
import { supabase } from '../lib/supabase';

// Module-level cache — categories are static reference data that rarely change.
// Shared across all component instances so navigation between pages never re-fetches.
let _cache: MarketplaceCategory[] | null = null;
let _pending: Promise<MarketplaceCategory[]> | null = null;

export function useCachedCategories(): MarketplaceCategory[] {
  const [categories, setCategories] = useState<MarketplaceCategory[]>(_cache ?? []);

  useEffect(() => {
    if (_cache) return;
    let cancelled = false;
    if (!_pending) {
      _pending = getCategories(supabase).then((r) => {
        _cache = r.data ?? [];
        return _cache;
      });
    }
    _pending.then((data) => {
      if (!cancelled) setCategories(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}
