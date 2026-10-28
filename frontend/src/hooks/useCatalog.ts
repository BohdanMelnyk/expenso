import { useEffect, useState } from 'react';
import { categoryAPI, vendorAPI, type Category, type Vendor } from '../api/client';

interface Catalog {
  categories: Category[];
  vendors: Vendor[];
}

let cached: Catalog | null = null;
let loading: Promise<Catalog> | null = null;
const listeners = new Set<(c: Catalog) => void>();

const load = () => {
  loading = Promise.all([categoryAPI.getCategories(), vendorAPI.getVendors()])
    .then(([c, v]) => {
      cached = { categories: c.data ?? [], vendors: v.data ?? [] };
      listeners.forEach((l) => l(cached!));
      return cached;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
};

/** Categories and vendors, loaded once and shared by every page. */
export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog>(cached ?? { categories: [], vendors: [] });

  useEffect(() => {
    listeners.add(setCatalog);
    if (!cached && !loading) load();
    return () => {
      listeners.delete(setCatalog);
    };
  }, []);

  const categoryByName = (name?: string) => catalog.categories.find((c) => c.name.toLowerCase() === (name ?? '').toLowerCase());
  return { ...catalog, categoryByName, refresh: load };
}
