// Shared support footer for the authenticated H.O.M.S portals (Student,
// Sister, Warden, HOD). ONE definition rendered by each active layout, so the
// wording and contact link can never drift apart between portals. Static
// mailto link only — no form, no API, no email service.
import '../styles/platform-footer.css';

export default function PlatformFooter() {
  return (
    <footer className="platform-footer" role="contentinfo">
      <p className="platform-footer__text">
        Having an issue with the platform? Contact us:{' '}
        <a
          className="platform-footer__link"
          href="mailto:prasanna.a.s.138@kalvium.community"
        >
          prasanna.a.s.138@kalvium.community
        </a>
      </p>
    </footer>
  );
}