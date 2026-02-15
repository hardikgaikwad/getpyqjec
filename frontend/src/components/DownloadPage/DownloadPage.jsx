import { useState, useRef, useEffect } from "react";
import FormPYQ from "./Form";
import DataArea from "./DataArea";
import { fetchUrls } from "../../http";
import ErrorPage from "../ErrorPage/Error";
import LoadingPage from "./LoadingPage";
export default function DownloadPage() {
  const [fetchedData, setFetchedData] = useState(null);
  const [error, setError] = useState();
  const [isLoading, setIsLoading] = useState(false);

  // Refs for auto-scroll
  const loadingRef = useRef(null);

  const fetchFn = async (queryString) => {
    setIsLoading(true);
    try {
      const data = await fetchUrls(queryString);
      setFetchedData(data);
      setError(null);
      return data;
    } catch (err) {
      setError({ message: err.message } || "failed to fetch data");
      setFetchedData(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto scroll when error happens
  useEffect(() => {
    if (isLoading && !error) {
      loadingRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [error, isLoading]);
  return (
    <div className="download-page">
      <FormPYQ fetchFn={fetchFn} />
      {isLoading && !error && (
        <div ref={loadingRef}>
          <LoadingPage />
        </div>
      )}

      {!isLoading && error && <ErrorPage />}

      {!isLoading && !error && fetchedData && (
        <DataArea url={fetchedData} />
      )}
    </div>
  );
}
