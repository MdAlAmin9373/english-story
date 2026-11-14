import type { CSSProperties } from "react";
import { BookLink } from "./BookLink";
import {
  CATEGORIES,
  categoryHref,
  storyCountLabel,
  type CategoryCounts,
} from "../categories";

// The home page shelf: one book per category, each a real link to its category page.
// All visible text is in the DOM (the spine copy is aria-hidden to avoid reading the
// name twice); the 3D turn and cover swing are pure CSS in app/globals.css (.shelf, .book, …).
// Only BookLink is a client component (open-the-book click handling).
export function Bookshelf({ counts }: { counts: CategoryCounts }) {
  return (
    <ul className="shelf" aria-label="গল্পের বিভাগ">
      {CATEGORIES.map((category, index) => {
        const style = {
          "--book-cover": category.cover,
          "--book-spine": category.spine,
          "--book-ink": category.ink,
        } as CSSProperties;
        // Drives the staggered entrance on the flat (touch / narrow) layout.
        const slotStyle = { "--slot-index": index } as CSSProperties;
        return (
          <li key={category.value} className="shelf-slot" style={slotStyle}>
            <BookLink href={categoryHref(category)} className="book" style={style}>
              <span className="book-body">
                {/* The inner page revealed when the cover swings open; decorative only. */}
                <span className="book-page" aria-hidden="true" />
                <span className="book-spine" aria-hidden="true">
                  <span className="book-spine-title">{category.nameBn}</span>
                  <span className="book-spine-icon">{category.icon}</span>
                </span>
                <span className="book-cover">
                  <span className="book-icon" aria-hidden="true">
                    {category.icon}
                  </span>
                  {/* Spaces keep the link's accessible name readable; flex hides them visually. */}
                  <span className="book-title">{category.nameBn}</span>{" "}
                  <span className="book-title-en" lang="en">
                    {category.nameEn}
                  </span>{" "}
                  <span className="book-count">{storyCountLabel(counts[category.value])}</span>
                </span>
              </span>
            </BookLink>
          </li>
        );
      })}
    </ul>
  );
}
