import classes from "./NavBar.module.css";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import userIcon from "../../assets/user.svg";

export default function NavBar() {
  const { isLoggedIn, user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  async function handleLogout() {
    await logout();
    navigate("/");
  }
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <nav className={classes.navbar}>
      <NavLink to="" className={() => classes["download-link"]}>
        <div className={classes["navbar-left"]}>
          <svg
            className={classes["navbar-logo"]}
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5l-5.5-5.5L6 11l4.5 4.5 9-9L18.5 6z" />
          </svg>
          <span className={classes["navbar-title"]}>OPEN SOURCE JEC</span>
        </div>
      </NavLink>

      <div className={classes["navbar-right"]}>
        <NavLink
          to="/upload"
          className={({ isActive }) =>
            `${classes["navbar-link"]} ${isActive ? classes.active : ""}`
          }
        >
          UPLOAD
        </NavLink>
        {isLoggedIn ? (
          <div ref={dropdownRef} className={classes["user-menu"]}>
            <img
              src={userIcon}
              alt="User"
              className={classes["user-icon"]}
              onClick={() => setShowDropdown((prev) => !prev)}
            />
            {showDropdown && (
              <div className={classes.dropdown}>
                <span className={classes["dropdown-name"]}>{user?.name}</span>
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
          <NavLink
            to="profile?mode=login"
            className={({ isActive }) =>
              `${classes["navbar-link"]} ${classes["profile-link"]} ${
                isActive ? classes.active : ""
              }`
            }
          >
            <span>PROFILE</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
