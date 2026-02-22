import { useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import styles from "./LoginForm.module.css";

export default function LoginForm() {
  const [searchParams] = useSearchParams();
  const isLogin = searchParams.get("mode") === "signin";
  const [form, setForm] = useState({
    email: "",
    rollno: "",
    name : "",
    password: "",
    identifier: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.container}>
        <h1 className={styles.heading}>{isLogin ? "Sign In" : "Sign Up"}</h1>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          {!isLogin && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="rollno">
                Roll No.
              </label>
              <input
                id="rollno"
                name="rollno"
                type="text"
                className={styles.input}
                placeholder="0201IT221015"
                value={form.rollno}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {!isLogin && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="rollno">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={styles.input}
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={styles.input}
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitBtn}>
              Submit
            </button>
          </div>
          <h3 className={styles.infoText}>{isLogin ? "Don't have an account? Please Sign up!" : "If you already has an account, just sign in."}</h3>
          <NavLink to={`?mode=${isLogin ? "signup" : "signin"}`} className={styles.switchLink}>
            {isLogin ? "Sign up" : "Sign in"}
          </NavLink>
        </form>
      </div>
    </div>
  );
}
