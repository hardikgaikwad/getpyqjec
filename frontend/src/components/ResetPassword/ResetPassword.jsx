import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "../LoginForm/LoginForm.module.css";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(
        `http://localhost:8000/auth/reset-password/${uid}/${token}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => navigate("/profile?mode=login"), 2000);
      } else {
        setError(data.error || "Reset failed");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Reset Password</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
