import { useState, useEffect } from "react";

export default function useFetch(fetchfn, availableData) {
  const [fetchedData, setFetchedData] = useState(availableData);
  const [error, setError] = useState();
  const [isLoading, setIsLoading] = useState();

  useEffect(() => {
    setIsLoading(true);
    async function fetchData() {
      try {
        const data = await fetchfn();

        setFetchedData(data);
      } catch (err) {
        setError({ message: err.message } || "failed to fetch data");
      }
      setIsFetching(false);
    }
    fetchData();
  }, [fetchfn]);

  return {
    fetchedData,
    error,
    isLoading
  }
}
