import { useRouteError } from "react-router-dom";

const ErrorPage = ({message, status}) => {
  // Try to get error from React Router (when used as errorElement)
  let routeError = null;
  try {
    routeError = useRouteError();
  } catch (e) {
    // Not inside a React Router error boundary — ignore
  }

  // Props take priority, then fall back to route error info
  console.log("RouteError is: ",routeError);
  const errorMessage = message || routeError?.data || routeError?.message || routeError?.statusText || "An unexpected error occurred";
  const errorStatus = status || routeError?.status || null;
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)',
        borderRadius: '20px',
        padding: '50px 40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(239, 68, 68, 0.1)',
        maxWidth: '500px',
        width: '100%',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
      }}>
        {/* Error Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 30px',
          background: 'linear-gradient(45deg, #ef4444, #dc2626)',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            fontSize: '36px',
            color: '#ffffff',
            fontWeight: 'bold'
          }}>
            ⚠
          </div>
        </div>

        {/* Error Status Code */}
        {errorStatus && (
          <div style={{
            fontSize: '5em',
            fontWeight: '900',
            lineHeight: '1',
            marginBottom: '10px',
            background: 'linear-gradient(45deg, #ef4444, #f97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-2px',
            filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.3))'
          }}>
            {errorStatus}
          </div>
        )}

        {/* Error Title */}
        <h1 style={{
          color: '#ffffff',
          fontSize: '2.2em',
          marginBottom: '20px',
          fontWeight: '700',
          background: 'linear-gradient(45deg, #ef4444, #f97316)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 30px rgba(239, 68, 68, 0.5)'
        }}>
          Oops! Something went wrong
        </h1>


        {/* Error Details */}
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '10px',
          padding: '15px',
          marginBottom: '35px'
        }}>
          <p style={{
            color: '#fca5a5',
            fontSize: '14px',
            margin: 0,
            fontWeight: '500'
          }}>
            <strong>Error:</strong> {errorMessage}
          </p>
        </div>


        {/* Additional Help Text */}
        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{
            color: '#9ca3af',
            fontSize: '14px',
            margin: 0
          }}>
            If the problem persists, please check your internet connection or contact support.
          </p>
        </div>
      </div>

      {/* Add keyframes for animation */}
      <style >{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 15px 40px rgba(239, 68, 68, 0.4);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
          }
        }
        
        @media (max-width: 520px) {
          div[style*="padding: 50px 40px"] {
            padding: 40px 25px !important;
          }
          
          h1 {
            font-size: 1.8em !important;
          }
          
          div[style*="display: flex"][style*="gap: 15px"] {
            flex-direction: column;
          }
          
          button {
            width: 100% !important;
            min-width: auto !important;
          }
        }
        
        @media (max-width: 400px) {
          div[style*="padding: 40px 25px"] {
            padding: 30px 20px !important;
          }
          
          div[style*="width: 80px"] {
            width: 60px !important;
            height: 60px !important;
            font-size: 28px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ErrorPage;