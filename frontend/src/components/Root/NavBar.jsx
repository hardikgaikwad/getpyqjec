import classes from "./NavBar.module.css";
import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className={classes.navbar}>
      <NavLink to="" className={()=>classes["download-link"]}>
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

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${classes["navbar-link"]} ${classes["profile-link"]} ${
              isActive ? classes.active : ""
            }`
          }
        >
          <span>PROFILE</span>
          <svg
            className={classes["profile-icon"]}
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </NavLink>
      </div>
    </nav>
  );
}
