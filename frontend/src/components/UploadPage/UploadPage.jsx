import { useState, useRef, useEffect } from "react";
import UploadForm from "./UploadForm";
import { uploadData } from "../../http";
import ErrorPage from "../ErrorPage/Error";
import { useAuth } from "../../store/AuthContext";
export default function UploadDataPage() {
  const [error, setError] = useState();
  const { logout } = useAuth();
  // Refs for auto-scroll
  const errorRef = useRef(null);

  async function uploadDataFn(formData) {
    try {
      await uploadData(formData);
      setError(null);
    } catch (err) {
      setError(
        { message: err.message } || { message: "failed to upload data" },
      );
      if (err.message.includes("Session expired")) {
        alert("Session Expired! Please login again.");
        logout();
      }
      throw err;
    }
  }

  // Auto scroll when error happens
  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [error]);
  return (
    <div className="upload-page">
      <UploadForm uploadFn={uploadDataFn} />
      {error && (
        <div ref={errorRef}>
          <ErrorPage message={error.message} />
        </div>
      )}
    </div>
  );
}
