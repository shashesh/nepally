# NUSA Web App (Next.js)

This is the web application for NUSA, built with Next.js and React.

## Tech Stack

- **React:** 19.1.0
- **Next.js:** 15.5.12
- **TypeScript:** 5.3.3+
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

> **Note:** This project uses Next.js 15.5.12 instead of Next.js 16 because Next.js 16 with Turbopack has React 19 compatibility issues. Next.js 15 provides stable, production-ready React 19 support.

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
- **Shared Package** - Imports business logic from @nusa/shared
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
