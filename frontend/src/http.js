import { API_BASE } from "./config";

/**
 * Helper to make authenticated requests with automatic token refresh on 401.
 */
async function authFetch(url, options = {}) {
  let token = localStorage.getItem("access_token");

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const reqOptions = {
    ...options,
    headers,
    credentials: "include",
  };

  let res = await fetch(url, reqOptions);

  if (res.status === 401) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      localStorage.setItem("access_token", refreshData.access);
      token = refreshData.access;

      headers.set("Authorization", `Bearer ${token}`);
      res = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    } else {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:logout"));
      throw new Error("Session expired. Please login again.");
    }
  }

  return res;
}

const fetchUrls = async (queries) => {
  const res = await fetch(`${API_BASE}/download/?` + queries);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let errorMsg = errorData.error || "Failed to fetch data";
    if (
      typeof errorMsg === "string" &&
      (errorMsg.toLowerCase().includes("nosuchkey") ||
        errorMsg.toLowerCase().includes("not exist") ||
        errorMsg.toLowerCase().includes("failed to download object"))
    ) {
      errorMsg = "PYQ missing";
    }
    throw new Error(errorMsg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const disposition = res.headers.get("Content-Disposition");
  let name = "pyq_download.pdf";
  if (disposition) {
    const match = disposition.match(/filename="?(.+?)"?$/);
    if (match) name = match[1];
  }

  const missingHeader = res.headers.get("X-missing_years");
  const missingYears = missingHeader
    ? missingHeader.split(",").map((y) => y.trim())
    : [];

  const missingDetailsHeader = res.headers.get("X-missing_details");
  let missingDetails = null;
  if (missingDetailsHeader) {
    try {
      missingDetails = JSON.parse(decodeURIComponent(missingDetailsHeader));
    } catch {
      missingDetails = null;
    }
  }

  return { url, name, missingYears, missingDetails };
};

const uploadData = async (data) => {
  const res = await authFetch(`${API_BASE}/upload/`, {
    method: "POST",
    body: data,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload data");
  }
  return await res.json();
};

const fetchExistingPYQs = async (branch, semester, subjectCode) => {
  const params = new URLSearchParams({
    branch,
    semester: String(semester),
    subject_code: subjectCode,
  });
  const res = await fetch(`${API_BASE}/upload/?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch existing PYQs");
  }
  return await res.json();
};

const getVerificationStatus = async () => {
  const res = await authFetch(`${API_BASE}/verification/status/`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch verification status");
  }
  return await res.json();
};

const submitVerification = async (formData) => {
  const res = await authFetch(`${API_BASE}/verification/submit/`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to submit verification");
  }
  return data;
};

const resubmitVerification = async (formData) => {
  const res = await authFetch(`${API_BASE}/verification/resubmit/`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to resubmit verification");
  }
  return data;
};

// Admin endpoints
const getAdminVerifications = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await authFetch(`${API_BASE}/admin-api/verifications/?${query}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch verification list");
  }
  return await res.json();
};

const getAdminVerificationDetail = async (id) => {
  const res = await authFetch(`${API_BASE}/admin-api/verifications/${id}/`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch verification details");
  }
  return await res.json();
};

const approveVerification = async (id) => {
  const res = await authFetch(`${API_BASE}/admin-api/verifications/${id}/approve/`, {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to approve verification");
  }
  return data;
};

const rejectVerification = async (id, reason) => {
  const res = await authFetch(`${API_BASE}/admin-api/verifications/${id}/reject/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to reject verification");
  }
  return data;
};

const deleteVerificationDocument = async (id) => {
  const res = await authFetch(`${API_BASE}/admin-api/verifications/${id}/document/`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to delete document");
  }
  return data;
};

const getAdminUploadHistory = async ({
  order = "recent",
  branch = "",
  semester = "",
  year = "",
  subject_code = "",
  search = "",
  page = 1,
  page_size = 15,
} = {}) => {
  const queryParams = new URLSearchParams();
  if (order) queryParams.append("order", order);
  if (branch && branch !== "ALL") queryParams.append("branch", branch);
  if (semester && semester !== "ALL") queryParams.append("semester", semester);
  if (year && year !== "ALL") queryParams.append("year", year);
  if (subject_code && subject_code !== "ALL") queryParams.append("subject_code", subject_code);
  if (search) queryParams.append("search", search);
  if (page) queryParams.append("page", page);
  if (page_size) queryParams.append("page_size", page_size);

  const res = await authFetch(`${API_BASE}/admin-api/pyqs/history/?${queryParams.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch upload history");
  }
  return await res.json();
};

const getAdminPYQDownloadUrl = async (id) => {
  const res = await authFetch(`${API_BASE}/admin-api/pyqs/${id}/download-url/`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate download URL");
  }
  return await res.json();
};

const fetchSubjects = async (branch, semester) => {
  const res = await fetch(
    `${API_BASE}/subjects/?branch=${encodeURIComponent(branch)}&semester=${encodeURIComponent(semester)}`
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch subjects");
  }
  return await res.json();
};

const requestSubjectAddition = async ({ branch, semester, code, name }) => {
  const res = await authFetch(`${API_BASE}/subjects/request/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ branch, semester, code, name }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to submit subject request");
  }
  return await res.json();
};

const getAdminSubjectRequests = async ({
  status = "pending",
  branch = "",
  semester = "",
  search = "",
  page = 1,
  page_size = 15,
} = {}) => {
  const queryParams = new URLSearchParams();
  if (status && status !== "all") queryParams.append("status", status);
  if (branch && branch !== "ALL") queryParams.append("branch", branch);
  if (semester && semester !== "ALL") queryParams.append("semester", semester);
  if (search) queryParams.append("search", search);
  if (page) queryParams.append("page", page);
  if (page_size) queryParams.append("page_size", page_size);

  const res = await authFetch(`${API_BASE}/admin-api/subject-requests/?${queryParams.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch subject requests");
  }
  return await res.json();
};

const approveSubjectRequest = async (id) => {
  const res = await authFetch(`${API_BASE}/admin-api/subject-requests/${id}/approve/`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to approve subject request");
  }
  return await res.json();
};

const rejectSubjectRequest = async (id, reason) => {
  const res = await authFetch(`${API_BASE}/admin-api/subject-requests/${id}/reject/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to reject subject request");
  }
  return await res.json();
};

export {
  fetchUrls,
  uploadData,
  fetchExistingPYQs,
  fetchSubjects,
  requestSubjectAddition,
  getAdminSubjectRequests,
  approveSubjectRequest,
  rejectSubjectRequest,
  getVerificationStatus,
  submitVerification,
  resubmitVerification,
  getAdminVerifications,
  getAdminVerificationDetail,
  approveVerification,
  rejectVerification,
  deleteVerificationDocument,
  getAdminUploadHistory,
  getAdminPYQDownloadUrl,
};



