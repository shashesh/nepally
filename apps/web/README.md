# Nepally Web App (Next.js)

This is the web application for Nepally, built with Next.js and React.

## Tech Stack

- **React:** 19.2.3
- **Next.js:** 16.2.7 (Turbopack)
- **TypeScript:** 6.0+
- **Backend:** Supabase
- **Styling:** CSS Modules

## Setup

```bash
# Install dependencies (from monorepo root)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

> **Note:** React is pinned to exactly **19.2.3** across the monorepo (root `overrides`) because React Native 0.86.3 requires an exact React match. Do not bump React independently — it moves only with an Expo SDK upgrade. See [TECH-VERSIONS.md](../../TECH-VERSIONS.md).

## Project Structure

```
src/
├── pages/         # Next.js pages (routes)
│   ├── index.tsx        # Home page
│   ├── posts/           # Post pages for SEO
│   ├── _app.tsx         # Custom App component
│   └── _document.tsx    # Custom Document component
├── components/    # Reusable React components
├── lib/           # Utility functions and API clients
├── styles/        # CSS modules and global styles
└── public/        # Static assets
```

## Key Features

- **Server-Side Rendering (SSR)** - For excellent SEO
- **Static Site Generation (SSG)** - For faster page loads
- **TypeScript** - Type-safe code
- **CSS Modules** - Scoped styling
- **Shared Package** - Imports business logic from @nepally/shared
- **Vercel Deployment** - Optimized for Vercel hosting

## SEO Optimization

### Post Pages

Each post has a dedicated URL for SEO:

```
https://nusa.app/posts/housing/abc123
https://nusa.app/posts/jobs/def456
```

Post pages use Server-Side Rendering to:
- Generate proper HTML for search engines
- Include meta tags (title, description, Open Graph)
- Load fast for good Core Web Vitals

### Example Post Page

```typescript
export async function getServerSideProps({ params }) {
  const post = await getPost(params.id);

  return {
    props: {
      post,
      title: `${post.title} - ${post.category}`,
      description: post.description,
    },
  };
}
```

## Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from your Supabase project dashboard (Settings > API).

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Vercel will automatically deploy

### Manual Deployment

```bash
npm run build
npm start
```

## Development

- Edit pages in `src/pages/`
- Components in `src/components/`
- Styles in `src/styles/`
- Hot reload enabled (changes appear instantly)
