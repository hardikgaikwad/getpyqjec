import classes from "./DataArea.module.css";
import { useState, useRef, useEffect } from "react";
import ErrorPage from "../ErrorPage/Error";

export default function DataArea({ url }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const errorRef = useRef();

  // Take the first file from the array
  const file = url;

  async function downloadFile(url, filename) {
    try {
      setIsDownloading(true);
      setIsComplete(false);
      setError(false);

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setIsDownloading(false);
      setIsComplete(true);

      // Reset complete state after 3 seconds
      setTimeout(() => setIsComplete(false), 3000);
    } catch (err) {
      setIsDownloading(false);
      setError(true);
      setErrorMessage(
        `Failed to download file. ${err.message || err}`
      );
    }
  }

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [error]);

  if (!file) return null;

  return (
    <>
      <div className={classes["main-container"]}>
        <div className={classes.header}>
          <h1>YOUR DOCUMENT</h1>
          <p className={classes.subtitle}>Previous Year Question Paper</p>
        </div>

        <div className={classes["card-wrapper"]}>
          <div className={classes.card}>
            {/* Decorative glowing orbs */}
            <div className={classes["glow-orb-1"]}></div>
            <div className={classes["glow-orb-2"]}></div>

            {/* PDF Icon */}
            <div className={classes["icon-area"]}>
              <div className={classes["pdf-icon-large"]}>
                <div className={classes["pdf-fold"]}></div>
                <span className={classes["pdf-label"]}>PDF</span>
              </div>
            </div>

            {/* File Info */}
            <div className={classes["file-info"]}>
              <h2 className={classes["file-name"]}>{file.name}</h2>
              <div className={classes["file-meta"]}>
                <span className={classes["meta-badge"]}>
                  <span className={classes["meta-dot"]}></span>
                  Ready to download
                </span>
              </div>
            </div>

            {/* Download Button */}
            <button
              className={`${classes["download-btn"]} ${isDownloading ? classes["downloading"] : ""
                } ${isComplete ? classes["complete"] : ""}`}
              onClick={() => downloadFile(file.url, file.name)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <span className={classes["btn-content"]}>
                  <span className={classes.spinner}></span>
                  Downloading...
                </span>
              ) : isComplete ? (
                <span className={classes["btn-content"]}>
                  <span className={classes["check-icon"]}>✓</span>
                  Downloaded!
                </span>
              ) : (
                <span className={classes["btn-content"]}>
                  <span className={classes["download-icon"]}>⬇</span>
                  Download File
                </span>
              )}
            </button>

            {/* Pulse ring on hover */}
            <div className={classes["pulse-ring"]}></div>
          </div>
        </div>
      </div>
      {error && (
        <div ref={errorRef}>
          <ErrorPage msg={errorMessage}></ErrorPage>
        </div>
      )}
    </>
  );
}
