# Marketplace Category Consolidation Plan

**Status:** Implemented (016_consolidate_marketplace_categories.sql)
**Last Updated:** 2026-04-02

## Previous State: 12 Categories
1. Food & Restaurants
2. Grocery & Specialty
3. Professional Services
4. Immigration & Legal
5. Remittance & Finance
6. Health & Wellness
7. Education & Tutoring
8. Transportation
9. Home Services
10. Beauty & Wellness
11. Cultural Services
12. Other

---

## Implemented: 5 Categories

| # | Category | Slug | Emoji | Merged From |
|---|---|---|---|---|
| 1 | **Food & Restaurants** | `food-restaurants` | 🍜 | Food & Restaurants + Grocery & Specialty |
| 2 | **Immigration & Legal** | `immigration-legal` | ⚖️ | Immigration & Legal (unchanged) |
| 3 | **Professional Services** | `professional-services` | 💼 | Professional Services + Health & Wellness + Education & Tutoring + Home Services + Transportation + Beauty & Wellness + Cultural Services |
| 4 | **Remittance & Finance** | `remittance-finance` | 💸 | Remittance & Finance (unchanged) |
| 5 | **Other** | `other` | 📦 | Other (unchanged) |

---

## Mapping (old → new)

| Removed Category | Remapped To |
|---|---|
| Grocery & Specialty | Food & Restaurants |
| Health & Wellness | Professional Services |
| Education & Tutoring | Professional Services |
| Home Services | Professional Services |
| Transportation | Professional Services |
| Beauty & Wellness | Professional Services |
| Cultural Services | Professional Services |

---

## Migration Details

- **Migration file:** `016_consolidate_marketplace_categories.sql`
- **Approach:** Kept 5 existing slugs; remapped listings from 7 merged categories; deleted merged category rows
- **No new UUIDs created** — all 5 surviving categories retain their original IDs
- **Constants updated:** `packages/shared/src/constants/marketplace.ts` defines the 5-category set
