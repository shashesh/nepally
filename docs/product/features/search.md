# Feature: Global Search

**Status:** Approved
**Phase:** 1
**Last Updated:** 2026-09-15
**Priority:** Medium

---

## Overview

Signed-in members can search community posts, marketplace listings and people from anywhere on the web app. Results default to the member's current metro, so local, practical content like rooms and jobs stays on top. One toggle widens the search to every metro.

## User stories

- As a member, I want suggestions while I type, so I can jump straight to a post, listing or person.
- As a member, I want a full results page with a tab per type, so I can scan everything that matches.
- As a member, I want to widen a search to all metros when nothing local matches.
- As a member on a phone, I want search to take the full screen so results are readable.

## Behaviour

| Surface | Behaviour |
|---|---|
| Top bar (≥48em) | Combobox. Suggestions after 2+ characters and a 250ms pause: Posts (3), Listings (2), People (3). Each group links "N more …" to its results tab. "See all results" and Enter (with nothing highlighted) open `/search`. ↑/↓, Enter and Esc work from the keyboard |
| Phone (<48em) | A search icon opens a full-screen overlay with the same suggestions |
| No local matches | "No matches in {metro}" with a **Search all metros** option |
| `/search?q=&tab=&scope=` | Tabs All · Posts · Listings · People with counts. "All" previews each type; type tabs scroll infinitely. Tab and scope live in the URL (shareable, Back-safe). Matching words are highlighted |

**Scope rules:**
- Posts and listings show the member's metro plus global items, or every metro with `scope=all`.
- People are searched nationwide, with members in the viewer's metro first.
- Only active posts and listings appear. Banned members never appear.
- Search is for signed-in members only.

**Matching:** full-text prefix matching, so "tha" finds "Thapa". Post titles rank above body text. Names are matched without stemming.

## Technical

- **Database:** `supabase/migrations/037_search.sql`. See [architecture/database-schema.md](../../architecture/database-schema.md) → "Global search".
- **Shared API:** `packages/shared/src/api/search.ts` (`searchPosts`, `searchListings`, `searchPeople`, `searchSuggestions`); helpers in `utils/searchQuery.ts`.
- **Web:**
  - `components/search/*` and `components/layout/SearchEntry.tsx`
  - `hooks/useSearchSuggestions.ts` and `hooks/useSearchPage.ts`
  - `pages/search.page.tsx`
- **Privacy:** `search_people` returns public profile columns only (`npm run test:security:users-pii`).
- **Not yet:** events search, mobile app UI, and search for signed-out visitors.
