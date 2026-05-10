import { useState } from "react";
import { NavLink } from "react-router-dom";
import styles from "../LoginForm/LoginForm.module.css"; // reuse login styles

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("http://localhost:8000/auth/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || "If an account exists, a reset link has been sent.");
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Forgot Password</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          {message && (
            <p style={{ color: "#4ade80", textAlign: "center", fontSize: "14px" }}>
              {message}
            </p>
          )}
          <div className={styles.buttonGroup}>
            <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
          <NavLink to="/profile?mode=login" className={styles.switchLink}>
            Back to Login
          </NavLink>
        </form>
      </div>
    </div>
  );
}
