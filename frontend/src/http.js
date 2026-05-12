import { API_BASE } from "./config";

const fetchUrls = async (queries) => {
  const res = await fetch(`${API_BASE}/download/?` + queries);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch data");
  }
  // Backend returns a PDF binary, not JSON
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const disposition = res.headers.get("Content-Disposition");
  let name = "pyq_download.pdf";
  if (disposition) {
    const match = disposition.match(/filename="?(.+?)"?$/);
    if (match) name = match[1];
  }

  // Parse missing years header
  const missingHeader = res.headers.get("X-missing_years");
  const missingYears = missingHeader
    ? missingHeader.split(",").map((y) => y.trim())
    : [];

  return { url, name, missingYears };
};

const uploadData = async (data) => {
  let token = localStorage.getItem("access_token");

  let res = await fetch(`${API_BASE}/upload/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
    body: data,
  });

  // If 401, try refreshing the token
  if (res.status === 401) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      credentials: "include", // sends refresh cookie
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      localStorage.setItem("access_token", refreshData.access);
      token = refreshData.access;

      // Retry the upload with new token
      res = await fetch(`${API_BASE}/upload/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        body: data,
      });
    } else {
      // Refresh token also expired → force logout
      throw new Error("Session expired. Please login again.");
    }
  }

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to upload data");
  }
  return await res.json();
};

export { fetchUrls, uploadData };
