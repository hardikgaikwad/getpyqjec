import { useState, useEffect, useCallback, useRef } from "react";
import FormPYQ from "./Form";
import DataArea from "./DataArea";
import { fetchUrls } from "../../http";
import ErrorPage from "../ErrorPage/Error";
import LoadingPage from "./LoadingPage";
import styles from "./DownloadPage.module.css";

export default function DownloadPage() {
  const [fetchedData, setFetchedData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const abortRef = useRef(null);
  const blobUrlRef = useRef(null);

  const releaseBlob = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // Cancel in-flight downloads and free the merged PDF when leaving the page.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      releaseBlob();
    };
  }, [releaseBlob]);

  const fetchFn = async (queryString) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    releaseBlob();
    setIsLoading(true);
    setProgress(null);
    setError(null);
    setFetchedData(null);
    try {
      const data = await fetchUrls(queryString, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      blobUrlRef.current = data.url;
      setFetchedData(data);
      setError(null);
      return data;
    } catch (err) {
      if (err.name === "AbortError") return null;
      setError({ message: err.message || "Failed to fetch data" });
      setFetchedData(null);
      throw err;
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
        setProgress(null);
      }
    }
  };

  const handleCloseModal = useCallback(() => {
    if (isLoading) return;
    setError(null);
    setFetchedData(null);
    releaseBlob();
  }, [isLoading, releaseBlob]);

  const isModalOpen = isLoading || Boolean(error) || Boolean(fetchedData);

  // Close on Escape key & lock body scrolling while modal is open (only when not loading)
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isLoading) {
        handleCloseModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isModalOpen, isLoading, handleCloseModal]);

  return (
    <div className={`download-page ${styles.downloadPage}`}>
      <FormPYQ fetchFn={fetchFn} />

      {/* Pop-up Modal Box for Loading, Error, and Download Result */}
      {isModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) {
              handleCloseModal();
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.modalContainer}>
            {isLoading && <LoadingPage progress={progress} />}

            {!isLoading && error && (
              <ErrorPage
                message={error.message}
                onClose={handleCloseModal}
              />
            )}

            {!isLoading && !error && fetchedData && (
              <DataArea
                url={fetchedData}
                onClose={handleCloseModal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
