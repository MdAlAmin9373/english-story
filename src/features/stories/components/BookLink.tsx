"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createBookOpener, type BookOpener } from "../book-opener";

type BookLinkProps = {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

// A shelf book: a real next/link <a> that, on a plain click/tap/Enter, swings its cover
// open (CSS in app/globals.css, driven by data-opening) and then navigates.
// Modified clicks and reduced motion fall through to normal link behaviour.
export function BookLink({ href, className, style, children }: BookLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [opening, setOpening] = useState(false);
  const openerRef = useRef<BookOpener | null>(null);
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Cache Components hides routes with <Activity> instead of unmounting them; layout
  // effect cleanups run on hide and effects re-run on show, so the book is closed
  // on mount, on unmount, and whenever the home page is shown again.
  useLayoutEffect(() => {
    const opener = createBookOpener({
      push: (to) => routerRef.current.push(to),
      prefetch: (to) => routerRef.current.prefetch(to),
      prefersReducedMotion: () =>
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
      isOnHome: () => window.location.pathname === "/",
      setOpening,
    });
    openerRef.current = opener;
    opener.reset();

    // Restored from the browser's back/forward cache: the DOM may still show it open.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) opener.reset();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      opener.dispose();
      openerRef.current = null;
      setOpening(false);
    };
  }, []);

  // Backup for router-cache restores: back on the home route means closed.
  useEffect(() => {
    if (pathname === "/") openerRef.current?.reset();
  }, [pathname]);

  return (
    <Link
      href={href}
      className={className}
      style={style}
      data-opening={opening ? "true" : undefined}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => openerRef.current?.onClick(event, href)}
      onAnimationEnd={(event: AnimationEvent<HTMLAnchorElement>) =>
        openerRef.current?.onAnimationEnd(event.animationName)
      }
    >
      {children}
    </Link>
  );
}
