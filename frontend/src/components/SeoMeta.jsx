import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applySeoToDocument, resolveSeoForPath } from '../utils/seo';

// Keeps the document's indexability in step with the screen that is open:
// the public entry / login page stays indexable for Google, while every
// authenticated screen (student, HOD, Sister, Warden, profile, outpass history,
// live movement, gate administration) is marked noindex.
//
// It renders nothing and touches no data, so routing, authentication, Socket.IO
// and the QR scanner are completely unaffected. See src/utils/seo.js for the
// full rationale.
export default function SeoMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    applySeoToDocument(resolveSeoForPath(pathname));
  }, [pathname]);

  return null;
}
