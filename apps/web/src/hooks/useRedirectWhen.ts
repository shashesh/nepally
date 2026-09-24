import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

/**
 * router.replace(href) in an effect while `condition` holds; returns `condition`
 * so the page can render nothing meanwhile (decision 5).
 *
 * Redirecting from the render body is a side effect that repeats on every
 * render until navigation lands; this fires once per href instead.
 */
export function useRedirectWhen(condition: boolean, href: string): boolean {
  const router = useRouter();
  const redirectedTo = useRef<string | null>(null);

  useEffect(() => {
    if (!condition) {
      redirectedTo.current = null;
      return;
    }
    if (redirectedTo.current === href) return;
    redirectedTo.current = href;
    void router.replace(href);
  }, [condition, href, router]);

  return condition;
}
