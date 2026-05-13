import { useState, useEffect } from 'react';
import styles from './LoadingPage.module.css';

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

  return (
    <div className={styles.body}>
      <div className={styles.loadingContainer}>
        {/* Spinner Animation */}
        {animationType === 'spinner' && (
          <div className={styles.spinner}></div>
        )}
        
        {/* Dots Animation */}
        {animationType === 'dots' && (
          <div className={styles.dotsLoader}>
            <div className={styles.dot} style={{ animationDelay: '0s' }}></div>
            <div className={styles.dot} style={{ animationDelay: '0.3s' }}></div>
            <div className={styles.dot} style={{ animationDelay: '0.6s' }}></div>
          </div>
        )}
        
        {/* Ring Animation */}
        {animationType === 'ring' && (
          <div className={styles.ringLoader}>
            <div className={styles.ringInner}></div>
            <div className={styles.ringInner} style={{ animationDelay: '0.6s' }}></div>
          </div>
        )}
        
        {/* Loading Text */}
        <div className={styles.loadingText}>
          {loadingMessages[messageIndex]}
        </div>
        <div className={styles.loadingSubtitle}>
          {subtitleMessages[messageIndex]}
        </div>
        
        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;