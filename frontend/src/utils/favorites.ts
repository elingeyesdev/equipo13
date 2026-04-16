// Local favorites (per browser) for Units and Materials.
// We persist only the IDs, and use them to reorder lists/selects.

const FAVORITE_UNIT_KEY = 'upc_favorites_units_v1';
const FAVORITE_MATERIAL_KEY = 'upc_favorites_materials_v1';

function safeParseStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === 'string');
  } catch {
    return [];
  }
}

function writeStringArray(key: string, ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(ids));
}

export function loadFavoriteUnitIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const ids = safeParseStringArray(window.localStorage.getItem(FAVORITE_UNIT_KEY));
  return new Set(ids);
}

export function saveFavoriteUnitIds(ids: Set<string>) {
  writeStringArray(FAVORITE_UNIT_KEY, Array.from(ids));
}

export function loadFavoriteMaterialIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const ids = safeParseStringArray(window.localStorage.getItem(FAVORITE_MATERIAL_KEY));
  return new Set(ids);
}

export function saveFavoriteMaterialIds(ids: Set<string>) {
  writeStringArray(FAVORITE_MATERIAL_KEY, Array.from(ids));
}

