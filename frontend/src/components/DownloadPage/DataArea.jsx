import classes from "./DataArea.module.css";
import { useState, useRef, useEffect } from "react";
import ErrorPage from "../ErrorPage/Error";
import pdfIcon from "../../assets/pdficon.svg";

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
        <div className={classes.card}>
          <div className={classes["card-body"]}>
            {/* PDF Icon */}
            <div className={classes["icon-area"]}>
              <img
                src={pdfIcon}
                alt="PDF"
                className={classes["pdf-icon-img"]}
              />
            </div>

            {/* File Info */}
            <div className={classes["file-info"]}>
              <h2 className={classes["file-name"]}>{file.name}</h2>
              <div className={classes["file-meta"]}>
                {/* Missing years warning badge */}
                {file.missingYears && file.missingYears.length > 0 && (
                  <span className={classes["meta-badge"]}>
                    <span className={classes["warning-dot"]}></span>
                    PYQ of {file.missingYears.join(", ")} not available.
                  </span>
                )}
                <span className={classes["meta-badge"]}>
                  <span className={classes["meta-dot"]}></span>
                  Ready to download.
                </span>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <div className={classes["download-area"]}>
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
                  Download
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      {error && (
        <div ref={errorRef}>
          <ErrorPage message={errorMessage}></ErrorPage>
        </div>
      )}
    </>
  );
}
