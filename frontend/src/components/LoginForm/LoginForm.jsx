import { useState } from "react";
import styles from "./LoginForm.module.css";

export default function LoginForm() {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({
    email: "",
    rollno: "",
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
        <h1 className={styles.heading}>{mode === "signin" ? "Sign In" : "Sign Up"}</h1>

        <div className={styles.toggleRow}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${mode === "signin" ? styles.active : ""}`}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${mode === "signup" ? styles.active : ""}`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {mode === "signup" ? (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="email">Email</label>
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

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="rollno">Roll No.</label>
                <input
                  id="rollno"
                  name="rollno"
                  type="text"
                  className={styles.input}
                  placeholder="Roll number"
                  value={form.rollno}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="password">Password</label>
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
            </>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="identifier">Roll No. or Email</label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  className={styles.input}
                  placeholder="Roll number or email"
                  value={form.identifier}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className={styles.input}
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitBtn}>
              {mode === "signin" ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
