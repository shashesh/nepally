# UNHN Web App (Next.js)

This is the web application for UNHN, built with Next.js and React.

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

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
- **Shared Package** - Imports business logic from @unhn/shared
- **Vercel Deployment** - Optimized for Vercel hosting

## SEO Optimization

### Post Pages

Each post has a dedicated URL for SEO:

```
https://unhn.app/posts/housing/abc123
https://unhn.app/posts/jobs/def456
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

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

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
