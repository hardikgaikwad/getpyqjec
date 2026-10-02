import { Link } from "react-router-dom";
import classes from "./Footer.module.css";
import logoImg from "../../assets/logo.png";

export default function Footer() {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  return (
    <>
      <footer className={classes.footer} role="contentinfo">
        <div className={classes.footerContainer}>
          <div className={classes.footerGrid}>
            {/* 1. Left Section: Brand & Community */}
            <div className={classes.brandSection}>
              <div className={classes.brandHeader}>
                <Link to="/" onClick={handleScrollToTop} className={classes.logoLink} aria-label="GETPYQ JEC Home">
                  <img src={logoImg} alt="GETPYQ JEC Logo" className={classes.logoImage} />
                </Link>
                <div className={classes.brandTextGroup}>
                  <Link to="/" onClick={handleScrollToTop} className={classes.titleLink} aria-label="GETPYQ JEC Home">
                    <span className={classes.logoTitle}>get(pyq jec)</span>
                  </Link>
                  <p className={classes.brandDescription}>
                    Clean, student-curated question paper archives for Jabalpur Engineering College.
                  </p>
                </div>
              </div>

              <a
                href="https://github.com/hardikgaikwad/getpyqjec"
                target="_blank"
                rel="noopener noreferrer"
                className={classes.githubBtn}
                id="footer-github-link"
              >
                <svg
                  className={classes.githubIcon}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>GitHub Repository</span>
              </a>
            </div>

            {/* 2. Middle Section: Navigation */}
            <div className={classes.navSection}>
              <h3 className={classes.columnTitle}>Navigation</h3>
              <ul className={classes.linksList}>
                <li className={classes.linkItem}>
                  <Link to="/about" onClick={handleScrollToTop} className={classes.footerLink} id="footer-about-link">
                    About Us
                  </Link>
                </li>
                <li className={classes.linkItem}>
                  <Link to="/" onClick={handleScrollToTop} className={classes.footerLink} id="footer-browse-link">
                    Browse &amp; Download PYQs
                  </Link>
                </li>
                <li className={classes.linkItem}>
                  <Link to="/upload" onClick={handleScrollToTop} className={classes.footerLink} id="footer-upload-link">
                    Upload Question Paper
                  </Link>
                </li>
                <li className={classes.linkItem}>
                  <Link to="/verify" onClick={handleScrollToTop} className={classes.footerLink} id="footer-verify-link">
                    Student Verification
                  </Link>
                </li>
              </ul>
            </div>

            {/* 3. Right Section: Contact */}
            <div className={classes.contactSection}>
              <h3 className={classes.columnTitle}>Contact</h3>
              <div className={classes.contactList}>
                <div className={classes.contactItem}>
                  <svg
                    className={classes.contactIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <a
                    href="mailto:getpyqjec@gmail.com"
                    className={classes.contactLink}
                    id="footer-email-link"
                  >
                    getpyqjec@gmail.com
                  </a>
                </div>

                <div className={classes.contactItem}>
                  <svg
                    className={classes.contactIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div className={classes.addressText}>
                    <div>Jabalpur Engineering College</div>
                    <div className={classes.addressSubText}>
                      Gokalpur, Jabalpur, MP 482011, India
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Bottom Bar (Sub-Footer) */}
          <div className={classes.bottomBar}>
            <p className={classes.copyrightText}>
              &copy; 2026 GETPYQJEC. An independent student community initiative.
            </p>
            <p className={classes.disclaimerText}>
              Not officially affiliated with Jabalpur Engineering College administration.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
