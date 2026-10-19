import classes from "./DataArea.module.css";
import { useState } from "react";
import ErrorPage from "../ErrorPage/Error";
import pdfIcon from "../../assets/pdficon.svg";

export default function DataArea({ url, onClose }) {
  // The merged PDF is already in memory, so clicking only hands it to the browser's
  // save flow. Browsers don't report when a save finishes, so we say "started".
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Take the first file from the array
  const file = url;

  function downloadFile(fileUrl, filename) {
    try {
      setError(false);

      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsStarted(true);

      // Reset the confirmation after 3 seconds
      setTimeout(() => setIsStarted(false), 3000);
    } catch (err) {
      setError(true);
      setErrorMessage(
        `Failed to download file. ${err.message || err}`
      );
    }
  }

  if (error) {
    return (
      <ErrorPage
        message={errorMessage}
        onClose={() => setError(false)}
      />
    );
  }

  if (!file) return null;

  return (
    <div className={`${classes["main-container"]} ${classes.modalMode}`}>
      <div className={classes.card}>
        {onClose && (
          <button
            type="button"
            className={classes.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        )}

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
              {/* Organized missing subjects per year when "All Subject" is selected */}
              {file.missingDetails && Object.keys(file.missingDetails).length > 0 ? (
                <div className={classes["missing-box"]}>
                  <div className={classes["missing-box-header"]}>
                    <span className={classes["warning-dot"]}></span>
                    <span>Missing Question Papers:</span>
                  </div>
                  <div className={classes["missing-box-list"]}>
                    {Object.entries(file.missingDetails).map(([year, subjectsList]) => (
                      <div key={year} className={classes["missing-row"]}>
                        <span className={classes["missing-year"]}>{year}</span>
                        <span className={classes["missing-dash"]}>-</span>
                        <span className={classes["missing-subjects"]}>
                          {subjectsList
                            .map((s) =>
                              typeof s === "string"
                                ? s
                                : s.name && s.code
                                ? `${s.name} (${s.code})`
                                : s.name || s.code
                            )
                            .join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : file.missingYears && file.missingYears.length > 0 ? (
                /* Missing years warning badge when a single subject is selected */
                <span className={classes["meta-badge"]}>
                  <span className={classes["warning-dot"]}></span>
                  PYQ of {file.missingYears.join(", ")} not available.
                </span>
              ) : null}

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
            className={`${classes["download-btn"]} ${isStarted ? classes["complete"] : ""}`}
            onClick={() => downloadFile(file.url, file.name)}
          >
            {isStarted ? (
              <span className={classes["btn-content"]}>
                <span className={classes["check-icon"]}>✓</span>
                Download started
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
  );
}
