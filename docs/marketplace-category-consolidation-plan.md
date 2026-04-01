# Marketplace Category Consolidation Plan

## Current State: 12 Categories
1. Food & Restaurants 🍜
2. Grocery & Specialty 🛒
3. Professional Services 💼
4. Immigration & Legal ⚖️
5. Remittance & Finance 💸
6. Health & Wellness 🏥
7. Education & Tutoring 🎓
8. Transportation 🚗
9. Home Services 🏠
10. Beauty & Wellness 💇
11. Cultural Services 🎭
12. Other 📦

---

## Proposed: 6 Categories

| # | New Category | Slug | Emoji | Icon | Merged From | Rationale |
|---|---|---|---|---|---|---|
| 1 | **Food & Groceries** | `food-groceries` | 🍜 | restaurant | Food & Restaurants + Grocery & Specialty | Natural pairing: cooking & food sourcing |
| 2 | **Business & Finance** | `business-finance` | 💼 | briefcase | Professional Services + Immigration & Legal + Remittance & Finance | All serve professional/financial needs; high volume in diaspora communities |
| 3 | **Health & Wellness** | `health-wellness` | 🏥 | medkit | Health & Wellness + Beauty & Wellness | Overlapping wellness ecosystem; beauty is self-care |
| 4 | **Education** | `education` | 🎓 | school | Education & Tutoring | Distinct & important for Nepali families seeking academic support |
| 5 | **Home & Transportation** | `home-transportation` | 🏠 | home | Home Services + Transportation | Both essential for daily living & mobility |
| 6 | **Culture & Other** | `culture-other` | 🎭 | palette | Cultural Services + Other | Cultural is community-specific; Other collects edge cases |

---

## Alternative: 5 Categories

If aggressive consolidation is needed:

| # | New Category | Slug | Emoji | Icon | Merged From |
|---|---|---|---|---|---|---|
| 1 | **Food & Groceries** | `food-groceries` | 🍜 | restaurant | Food & Restaurants + Grocery & Specialty |
| 2 | **Business & Finance** | `business-finance` | 💼 | briefcase | Professional Services + Immigration & Legal + Remittance & Finance |
| 3 | **Health & Wellness** | `health-wellness` | 🏥 | medkit | Health & Wellness + Beauty & Wellness + Education & Tutoring |
| 4 | **Services** | `services` | 🏠 | wrench | Home Services + Transportation + Cultural Services |
| 5 | **Other** | `other` | 📦 | cube | Everything not clearly categorized |

---

## Recommendation: **6 Categories**

**Reasoning:**
- ✅ Reduces cognitive load (12 → 6)
- ✅ Education stays visible (highly valued by Nepali families)
- ✅ Clear thematic boundaries (no confusion between Home/Transportation)
- ✅ Balanced distribution (not cramping too much into "Services")
- ✅ Preserves community/cultural identity in listings

---

## Migration Impact

### Affected Records
- All 12 existing categories have associated listings in `marketplace_listings`
- Need category ID mapping to migrate existing listings

### Database Changes Required
1. **New Migration** (`016_consolidate_marketplace_categories.sql`):
   - Insert 6 new categories with new UUIDs
   - Create mapping table (old_category_id → new_category_id)
   - Update existing listings to point to new categories
   - Mark old categories as deprecated (or soft-delete)

2. **Code Updates**:
   - Update constants (`packages/shared/src/constants/marketplace.ts`)
   - Seed new categories in test suite
   - Update any hardcoded category references in UI

---

## Approval Checkpoint

**Please confirm:**

- [ ] Use the **6-category** recommendation?
- [ ] Or prefer **5-category** consolidation?
- [ ] Any categories you'd like to regroup differently?

Once approved, we'll create the migration & seed script.
