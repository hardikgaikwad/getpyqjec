import { useAuth } from "../../store/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <div
        style={{ textAlign: "center", padding: "100px 20px", color: "#fff" }}
      >
        <h2 style={{ marginBottom: "16px" }}>You need to log in first</h2>
        <p style={{ color: "#9ca3af", marginBottom: "24px" }}>
          Only logged in users can upload PYQs
        </p>
        <a href="/profile?mode=login" style={{ color: "#6366f1" }}>
          Go to Login
        </a>
      </div>
    );
  }

  return children;
}
