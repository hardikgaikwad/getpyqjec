import { useAuth } from "../../store/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <div
        style={{ 
          textAlign: "center", 
          padding: "100px 20px", 
          color: "#EFEEE8",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        <h2 style={{ 
          marginBottom: "12px", 
          fontFamily: "'Outfit Medium', sans-serif",
          fontWeight: 500,
          fontSize: "2rem",
          color: "#EFEEE8"
        }}>
          You need to log in first
        </h2>
        <p style={{ 
          color: "rgba(239, 238, 232, 0.7)", 
          marginBottom: "32px",
          fontFamily: "'Degular Regular', sans-serif",
          fontSize: "1.1rem"
        }}>
          Only logged in users can upload PYQs
        </p>
        <a 
          href="/profile?mode=login" 
          style={{ 
            color: "white",
            background: "#FFFFFF80",
            padding: "12px 28px",
            borderRadius: "25px",
            textDecoration: "none",
            fontFamily: "'Degular Medium', sans-serif",
            fontSize: "15px",
            fontWeight: 500,
            transition: "all 0.2s ease"
          }}
        >
          Go to Login
        </a>
      </div>
    );
  }

  return children;
}
