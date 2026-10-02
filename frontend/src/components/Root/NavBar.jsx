import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useState, useRef, useEffect } from "react";
import classes from "./NavBar.module.css";

export default function NavBar() {
  const { isLoggedIn, user, logout, isAdmin } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  useEffect(() => {
    let ticking = false;
    let lastState = false;

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          const scrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
          // Hysteresis threshold:
          // Scroll down past 28px -> shrink to compact floating pill
          // Scroll up past 14px -> smoothly expand back before hitting top boundary
          const nextState = scrollY > (lastState ? 14 : 28);

          if (nextState !== lastState) {
            lastState = nextState;
            setIsScrolled(nextState);
          }
          ticking = false;
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!showDropdown) return;
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const vStatus = user?.verification_status || "unverified";

  return (
    <header className={classes.headerWrapper}>
      <nav className={`${classes.navbar} ${isScrolled ? classes.scrolled : ""}`}>
      <NavLink to="/" className={classes["download-link"]}>
        <div className={classes["logo-group"]}>
          <span className={classes["navbar-title"]}>get(pyq jec)</span>
        </div>
      </NavLink>

      <div className={classes["navbar-right"]}>
        {/* PYQ Papers Link */}
        <div className={classes["nav-item-wrapper"]}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${classes["icon-btn"]} ${isActive ? classes.active : ""}`
            }
            end
            aria-label="PYQ Papers"
          >
            <svg
              className={classes["nav-icon"]}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </NavLink>
          <div className={classes.tooltip}>
            <span>PYQ</span>
          </div>
        </div>

        {/* Upload PYQ Link */}
        <div className={classes["nav-item-wrapper"]}>
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `${classes["icon-btn"]} ${isActive ? classes.active : ""}`
            }
            aria-label="Upload PYQs"
          >
            <svg
              className={classes["nav-icon"]}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </NavLink>
          <div className={classes.tooltip}>
            <span>UPLOAD</span>
          </div>
        </div>

        {/* About Page Link */}
        <div className={classes["nav-item-wrapper"]}>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `${classes["icon-btn"]} ${isActive ? classes.active : ""}`
            }
            aria-label="About Us"
          >
            <svg
              className={classes["nav-icon"]}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </NavLink>
          <div className={classes.tooltip}>
            <span>ABOUT</span>
          </div>
        </div>

        {/* Profile / User Menu */}
        {isLoggedIn ? (
          <div ref={dropdownRef} className={classes["user-menu"]}>
            <div className={classes["nav-item-wrapper"]}>
              <button
                type="button"
                className={`${classes["icon-btn"]} ${showDropdown ? classes.active : ""}`}
                onClick={() => setShowDropdown((prev) => !prev)}
                aria-label="User Menu"
              >
                <svg
                  className={classes["nav-icon"]}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span
                  className={`${classes["status-dot"]} ${classes[vStatus]}`}
                  title={`Verification status: ${vStatus}`}
                />
              </button>
              {!showDropdown && (
                <div className={classes.tooltip}>
                  <span>PROFILE</span>
                </div>
              )}
            </div>

            {showDropdown && (
              <div className={classes.dropdown}>
                <div className={classes["dropdown-header"]}>
                  <span className={classes["dropdown-name"]}>
                    {"Hi " + (user?.name?.split(" ")[0] || "User")}
                  </span>
                  <span className={`${classes["status-badge"]} ${classes[vStatus]}`}>
                    {vStatus === "verified"
                      ? "Verified"
                      : vStatus === "pending"
                      ? "Pending"
                      : "Unverified"}
                  </span>
                </div>

                <NavLink
                  to="/verify"
                  className={classes["dropdown-item"]}
                  onClick={() => setShowDropdown(false)}
                >
                  Verification Status
                </NavLink>

                {isAdmin && (
                  <>
                    <NavLink
                      to="/admin/unlisted-subjects"
                      className={classes["dropdown-item"]}
                      onClick={() => setShowDropdown(false)}
                    >
                      Unlisted Subject Approval
                    </NavLink>
                    <NavLink
                      to="/admin/upload-history"
                      className={classes["dropdown-item"]}
                      onClick={() => setShowDropdown(false)}
                    >
                      Upload History
                    </NavLink>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className={classes["dropdown-logout"]}
                >
                  Logout
                </button>

              </div>
            )}
          </div>
        ) : (
          <div className={classes["nav-item-wrapper"]}>
            <NavLink
              to="/profile?mode=login"
              className={({ isActive }) =>
                `${classes["icon-btn"]} ${classes["profile-link"]} ${
                  isActive ? classes.active : ""
                }`
              }
              aria-label="Login or Profile"
            >
              <svg
                className={classes["nav-icon"]}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </NavLink>
            <div className={classes.tooltip}>
              <span>PROFILE</span>
            </div>
          </div>
        )}
      </div>
    </nav>
  </header>
  );
}
