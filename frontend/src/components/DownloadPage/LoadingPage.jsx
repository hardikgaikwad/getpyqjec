import { useState, useEffect } from 'react';
import styles from './LoadingPage.module.css';

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

function progressText(progress) {
  if (progress.phase === "merging") {
    return ["Almost Ready...", "Combining papers into one PDF"];
  }
  return [
    "Fetching PYQs...",
    `Downloaded ${progress.done} of ${progress.total} paper${progress.total === 1 ? "" : "s"}`,
  ];
}

const LoadingPage = ({ progress = null }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate loading messages every 2 seconds until real progress is available
  useEffect(() => {
    if (progress) return;
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [progress]);

  const [title, subtitle] = progress
    ? progressText(progress)
    : [loadingMessages[messageIndex], subtitleMessages[messageIndex]];

  return (
    <div className={styles.body}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>

        {/* Loading Text */}
        <div className={styles.loadingText}>{title}</div>
        <div className={styles.loadingSubtitle}>{subtitle}</div>

        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
