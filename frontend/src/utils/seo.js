// ---------------------------------------------------------------------------
// Public SEO metadata for the H.O.M.S entry page.
//
// WHY THIS IS A MODULE AND NOT A LIBRARYARY: everything here is a handful of
// strings plus one head update, so no SEO dependency is added to the bundle.
//
// WHY PER-ROUTE AT ALL: this application is a HASH-ROUTED single-page app
// (see src/main.jsx), so Google only ever sees ONE document: the public origin.
// The honest rule is therefore "the public entry page is indexable, every
// authenticated screen is not", expressed with the standard `robots` meta tag
// on the current screen. Nothing here touches business logic, API calls,
// authentication, Socket.IO or the QR scanner.
// ---------------------------------------------------------------------------

// The production origin already configured for this project - the same origin
// the backend CORS allow-list uses (server/app.js). No other domain is invented.
export const PUBLIC_ORIGIN = 'https://hostel-outpass-management-system.vercel.app';
export const PUBLIC_URL = `${PUBLIC_ORIGIN}/`;

// The project's own H.O.M.S logo, which already ships in public/ and is used by
// the PWA manifest. No new image is created or downloaded for sharing.
export const SOCIAL_IMAGE = `${PUBLIC_ORIGIN}/homs-logo.png`;
export const SOCIAL_IMAGE_ALT = 'H.O.M.S. - Hostel Outpass Management System';

export const SEO_TITLE = 'H.O.M.S. | Hostel Outpass Management System';
export const SEO_DESCRIPTION =
  "H.O.M.S. is the Hostel Outpass Management System for hostel students and staff at St. Joseph's University: apply for a hostel outpass, follow approvals and track gate movements.";

// The ONLY screens Google is allowed to index. Everything else in the app is an
// authenticated application screen (student, HOD, Sister, Warden, history, live
// movement, gate administration, profile). This list is deliberately small and
// default-deny, so a route added later can never become indexable by accident.
export const PUBLIC_PATHS = new Set(['/', '/login', '/register']);

export const isPublicPath = (pathname) => PUBLIC_PATHS.has(String(pathname ?? '/'));

// Single source of truth for the document metadata of one screen.
export const resolveSeoForPath = (pathname) => (isPublicPath(pathname)
  ? {
    public: true,
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    robots: 'index, follow',
    canonical: PUBLIC_URL,
  }
  : {
    public: false,
    // The private screens keep the same honest title/description (nothing about a
    // student, staff member, outpass or movement is ever exposed) and are only
    // removed from search results.
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    robots: 'noindex, nofollow',
    // No canonical on a private screen: it must not claim the public page as its
    // own identity, which would be a contradictory signal next to noindex.
    canonical: null,
  });

const upsertMeta = (doc, attribute, key, content) => {
  const selector = `meta[${attribute}="${key}"]`;
  let tag = doc.querySelector(selector);
  if (!tag) {
    tag = doc.createElement('meta');
    tag.setAttribute(attribute, key);
    doc.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const applyCanonical = (doc, href) => {
  const existing = doc.querySelector('link[rel="canonical"]');
  if (!href) {
    if (existing) doc.head.removeChild(existing);
    return;
  }
  if (existing) {
    existing.setAttribute('href', href);
    return;
  }
  const link = doc.createElement('link');
  link.setAttribute('rel', 'canonical');
  link.setAttribute('href', href);
  doc.head.appendChild(link);
};

// Writes the resolved metadata into the document head. Kept DOM-only and
// dependency-free so it can be verified without a browser.
export const applySeoToDocument = (seo, doc = (typeof document === 'undefined' ? null : document)) => {
  if (!doc) return;
  doc.title = seo.title;
  upsertMeta(doc, 'name', 'description', seo.description);
  upsertMeta(doc, 'name', 'robots', seo.robots);
  applyCanonical(doc, seo.canonical);
};
