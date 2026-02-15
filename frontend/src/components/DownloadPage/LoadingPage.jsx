import { useState, useEffect } from 'react';

const LoadingPage = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [animationType, setAnimationType] = useState('spinner'); // 'spinner', 'dots', 'ring'

  const loadingMessages = [
    "Loading Data...",
    "Fetching PYQs...",
    "Processing Request...",
    "Almost Ready..."
  ];
  
  const subtitleMessages = [
    "Fetching your PYQ papers, please wait",
    "Searching through question banks",
    "Preparing your documents",
    "Getting everything ready"
  ];

  // Optional: Rotate loading messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [loadingMessages.length]);


  const styles = {
    body: {
      minHeight: '100vh',
      backgroundColor: '#000000',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      padding: '20px',
      margin: 0
    },
    
    loadingContainer: {
      textAlign: 'center',
      background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)',
      borderRadius: '20px',
      padding: '50px 40px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(99, 102, 241, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      maxWidth: '400px',
      width: '100%'
    },

    spinner: {
      width: '60px',
      height: '60px',
      margin: '0 auto 30px',
      border: '4px solid rgba(99, 102, 241, 0.2)',
      borderTop: '4px solid #6366f1',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      display: animationType === 'spinner' ? 'block' : 'none'
    },

    dotsLoader: {
      display: animationType === 'dots' ? 'flex' : 'none',
      justifyContent: 'center',
      alignItems: 'center',
      margin: '0 auto 30px',
      width: '80px',
      height: '20px',
      gap: '8px'
    },

    dot: {
      width: '12px',
      height: '12px',
      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
      borderRadius: '50%',
      animation: 'dotPulse 1.5s infinite ease-in-out'
    },

    ringLoader: {
      display: animationType === 'ring' ? 'block' : 'none',
      width: '60px',
      height: '60px',
      margin: '0 auto 30px',
      position: 'relative'
    },

    loadingText: {
      color: '#ffffff',
      fontSize: '1.5em',
      fontWeight: '600',
      marginBottom: '15px',
      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },

    loadingSubtitle: {
      color: '#9ca3af',
      fontSize: '14px',
      fontWeight: '400',
      animation: 'fade 2s infinite ease-in-out'
    },

    progressContainer: {
      width: '100%',
      height: '4px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '2px',
      marginTop: '25px',
      overflow: 'hidden'
    },

    progressBar: {
      height: '100%',
      background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
      borderRadius: '2px',
      animation: 'progress 2s infinite ease-in-out'
    },

    switchButton: {
      marginTop: '20px',
      padding: '8px 16px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }
  };

  return (
    <div style={styles.body}>
      <div style={styles.loadingContainer}>
        {/* Spinner Animation */}
        <div style={styles.spinner}></div>
        
        {/* Dots Animation */}
        <div style={styles.dotsLoader}>
          <div style={{...styles.dot, animationDelay: '0s'}}></div>
          <div style={{...styles.dot, animationDelay: '0.3s'}}></div>
          <div style={{...styles.dot, animationDelay: '0.6s'}}></div>
        </div>
        
        {/* Ring Animation */}
        <div style={styles.ringLoader}>
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            border: '3px solid transparent',
            borderTop: '3px solid #6366f1',
            borderRight: '3px solid #8b5cf6',
            borderRadius: '50%',
            animation: 'ringPulse 1.2s linear infinite'
          }}></div>
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            border: '3px solid transparent',
            borderTop: '3px solid #6366f1',
            borderRight: '3px solid #8b5cf6',
            borderRadius: '50%',
            animation: 'ringPulse 1.2s linear infinite',
            animationDelay: '0.6s'
          }}></div>
        </div>
        
        {/* Loading Text */}
        <div style={styles.loadingText}>
          {loadingMessages[messageIndex]}
        </div>
        <div style={styles.loadingSubtitle}>
          {subtitleMessages[messageIndex]}
        </div>
        
        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}></div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes dotPulse {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes ringPulse {
          0% {
            transform: rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: rotate(360deg);
            opacity: 0.3;
          }
        }

        @keyframes fade {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes progress {
          0% {
            width: 0%;
          }
          50% {
            width: 70%;
          }
          100% {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          div[style*="padding: 50px 40px"] {
            padding: 40px 25px !important;
          }
          
          div[style*="fontSize: 1.5em"] {
            font-size: 1.3em !important;
          }
          
          div[style*="width: 60px"][style*="height: 60px"] {
            width: 50px !important;
            height: 50px !important;
          }
        }

        @media (max-width: 400px) {
          div[style*="padding: 40px 25px"] {
            padding: 35px 20px !important;
          }
          
          div[style*="fontSize: 1.3em"] {
            font-size: 1.2em !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingPage;