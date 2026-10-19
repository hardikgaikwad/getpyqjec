import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import styles from "./UploadForm.module.css";
import { branches, semesters } from "../../information";
import createPdfFromImages from "../../imgTopdf";
import CustomSelect from "../CustomSelect/CustomSelect";
import { requestSubjectAddition, fetchExistingPYQs } from "../../http";
import useSubjects from "../../hooks/useSubjects";
import { useAuth } from "../../store/AuthContext";
import ErrorPage from "../ErrorPage/Error";

// Generate current year + last 10 years (descending)
const currentYear = new Date().getFullYear();
const allYears = Array.from({ length: 11 }, (_, i) => currentYear - i);

// Must match MAX_PDF_SIZE_MB in core/views.py
const MAX_PDF_SIZE_MB = 10;

const ALL_SESSIONS = [
  { value: "April", label: "April" },
  { value: "December", label: "December" },
];

const initialState = {
  semester: "",
  branch: "",
  session: "",
  subject: "",
  year: "",
  files: [], // can be 1 PDF or multiple images
};

export default function UploadFormPYQ({ uploadFn }) {
  const { logout } = useAuth();
  const [selectedValues, setSelectedValues] = useState(initialState);
  const [existingPYQs, setExistingPYQs] = useState([]);
  const [loadingExistingPYQs, setLoadingExistingPYQs] = useState(false);
  const [customSubjectCode, setCustomSubjectCode] = useState("");
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [modalState, setModalState] = useState(null); // { type: 'uploading' | 'requesting' | 'success' | 'error', title, message, isSessionExpired }
  const [dragIndex, setDragIndex] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  const isUnlistedSubject = selectedValues.subject === "__UNLISTED__";
  const isBusy = modalState?.type === "uploading" || modalState?.type === "requesting";
  const upload = modalState?.type === "uploading";

  const handleCloseModal = useCallback(() => {
    if (modalState?.type === "uploading" || modalState?.type === "requesting") return;
    setModalState(null);
  }, [modalState]);

  const handleSessionExpired = useCallback(() => {
    setModalState(null);
    logout();
  }, [logout]);

  // Close on Escape key & lock body scrolling while modal is open (except during busy ops)
  useEffect(() => {
    if (!modalState) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isBusy) {
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
  }, [modalState, handleCloseModal, isBusy]);



  // Detect file type from selected files
  const detectedType = useMemo(() => {
    if (selectedValues.files.length === 0) return null;
    if (selectedValues.files[0].type === "application/pdf") return "pdf";
    return "image";
  }, [selectedValues.files]);

  // Generate stable thumbnail URLs
  const thumbnailUrls = useMemo(() => {
    if (detectedType !== "image") return [];
    return selectedValues.files.map((file) => URL.createObjectURL(file));
  }, [selectedValues.files, detectedType]);

  // Revoke object URLs on change/unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      thumbnailUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [thumbnailUrls]);

  function handleDragStart(e, index) {
    setDragIndex(index);
  }

  function handleDrop(e, dropIndex) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;
    const reordered = [...selectedValues.files];
    const [dragged] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, dragged);
    setSelectedValues((prev) => ({ ...prev, files: reordered }));
    setDragIndex(null);
  }

  const { subjects: dynamicSubjects, loading: loadingSubjects } = useSubjects(
    selectedValues.branch,
    selectedValues.semester
  );

  const subjectsToShow = useMemo(() => {
    if (!selectedValues.semester || !selectedValues.branch) return [];

    const options = [];

    if (dynamicSubjects.current.length > 0) {
      options.push({ label: "── Current Curriculum ──", isHeader: true });
      dynamicSubjects.current.forEach((s) => {
        options.push({ value: s.code, label: `${s.name} (${s.code})` });
      });
    }

    if (dynamicSubjects.past.length > 0) {
      options.push({ label: "── Past / Previously Taught Subjects ──", isHeader: true });
      dynamicSubjects.past.forEach((s) => {
        options.push({ value: s.code, label: `${s.name} (${s.code})` });
      });
    }

    options.push({ label: "── Other / Unlisted ──", isHeader: true });
    options.push({
      value: "__UNLISTED__",
      label: "Add unlisted subjects",
      triggerLabel: "Add unlisted subjects",
      icon: (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "#c084fc", flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
    });

    return options;
  }, [selectedValues.semester, selectedValues.branch, dynamicSubjects]);

  // Fetch already uploaded PYQs for the selected subject to filter out filled years & sessions
  useEffect(() => {
    if (
      !selectedValues.branch ||
      !selectedValues.semester ||
      !selectedValues.subject ||
      selectedValues.subject === "__UNLISTED__"
    ) {
      setExistingPYQs([]);
      setLoadingExistingPYQs(false);
      return;
    }

    const controller = new AbortController();
    setLoadingExistingPYQs(true);

    fetchExistingPYQs(selectedValues.branch, selectedValues.semester, selectedValues.subject, {
      signal: controller.signal,
    })
      .then((data) => {
        setExistingPYQs(data.uploaded || []);
        setLoadingExistingPYQs(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.warn("Failed to fetch existing PYQs for subject", err);
        setExistingPYQs([]);
        setLoadingExistingPYQs(false);
      });

    return () => controller.abort();
  }, [selectedValues.branch, selectedValues.semester, selectedValues.subject]);

  // Compute available years (exclude years where BOTH April and December are already uploaded)
  const availableYears = useMemo(() => {
    if (!selectedValues.subject || selectedValues.subject === "__UNLISTED__") {
      return allYears;
    }
    return allYears.filter((y) => {
      const uploadedSessions = existingPYQs
        .filter((p) => Number(p.year) === Number(y))
        .map((p) => (p.session || p.exam_session || "").toLowerCase());
      const hasApril = uploadedSessions.includes("april");
      const hasDecember = uploadedSessions.includes("december");
      return !(hasApril && hasDecember);
    });
  }, [selectedValues.subject, existingPYQs]);

  // Compute available sessions for the selected year (exclude sessions already uploaded)
  const availableSessions = useMemo(() => {
    if (!selectedValues.year) return ALL_SESSIONS;

    const uploadedSessions = existingPYQs
      .filter((p) => Number(p.year) === Number(selectedValues.year))
      .map((p) => (p.session || p.exam_session || "").toLowerCase());

    return ALL_SESSIONS.filter(
      (s) => !uploadedSessions.includes(s.value.toLowerCase())
    );
  }, [selectedValues.year, existingPYQs]);

  // Reset year if selected year is no longer available
  useEffect(() => {
    if (selectedValues.year && !availableYears.some((y) => String(y) === String(selectedValues.year))) {
      setSelectedValues((prev) => ({ ...prev, year: "", session: "" }));
    }
  }, [availableYears, selectedValues.year]);

  // Reset session if selected session is no longer available
  useEffect(() => {
    if (selectedValues.session && !availableSessions.some((s) => s.value === selectedValues.session)) {
      setSelectedValues((prev) => ({ ...prev, session: "" }));
    }
  }, [availableSessions, selectedValues.session]);

  // Handle file selection — auto-detect type
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setErrorMessage("");
    if (selectedFiles.length === 0) return;

    // Check if files are all the same type
    const hasPdf = selectedFiles.some((f) => f.type === "application/pdf");
    const hasImage = selectedFiles.some((f) => ["image/png", "image/jpeg"].includes(f.type));

    if (hasPdf && hasImage) {
      setErrorMessage("Cannot mix PDF and image files. Select one type.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (hasPdf) {
      // PDF mode
      if (selectedFiles.length > 1) {
        setErrorMessage("You can upload only 1 PDF file.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (selectedFiles[0].size > MAX_PDF_SIZE_MB * 1024 * 1024) {
        setErrorMessage(`PDF size must be ≤ ${MAX_PDF_SIZE_MB}MB.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    } else if (hasImage) {
      // Image mode
      if (selectedFiles.length > 6) {
        setErrorMessage("You can upload up to 6 images only.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      for (const file of selectedFiles) {
        if (file.size > 2 * 1024 * 1024) {
          setErrorMessage(`${file.name} exceeds 2MB size limit.`);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        if (!["image/png", "image/jpeg"].includes(file.type)) {
          setErrorMessage(`${file.name} is not a supported format.`);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      }
    } else {
      setErrorMessage("Unsupported file type. Use PDF, PNG, or JPG.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedValues((prev) => ({
      ...prev,
      files: selectedFiles,
    }));
  };

  // Remove all files
  const handleRemoveFiles = () => {
    setSelectedValues((prev) => ({
      ...prev,
      files: [],
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowOverlay(false);
  };

  // Remove a single image by index
  const handleRemoveOne = (index) => {
    setSelectedValues((prev) => {
      const updated = prev.files.filter((_, i) => i !== index);
      if (updated.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = "";
        setShowOverlay(false);
      }
      return { ...prev, files: updated };
    });
  };

  // Handle submit
  async function handleSubmit(event) {
    event.preventDefault();

    if (isUnlistedSubject) {
      const code = customSubjectCode.trim().toUpperCase();
      const name = customSubjectName.trim();

      if (!code || !name) {
        setModalState({
          type: "error",
          title: "Missing Subject Details",
          message: "Please enter both the subject code and subject name for the unlisted subject.",
        });
        return;
      }

      setModalState({ type: "requesting" });
      try {
        const res = await requestSubjectAddition({
          branch: selectedValues.branch,
          semester: Number(selectedValues.semester),
          code,
          name,
        });

        setSelectedValues(initialState);
        setCustomSubjectCode("");
        setCustomSubjectName("");
        if (formRef.current) formRef.current.reset();

        setModalState({
          type: "success",
          title: "Subject Request Submitted",
          message:
            res.message ||
            `Your request to add "${code} - ${name}" has been submitted for admin approval. Once approved, you'll receive an email notification and it will be available in the dropdown for PYQ upload.`,
        });
      } catch (error) {
        const isSessionExpired = error.message?.toLowerCase().includes("session expired");
        setModalState({
          type: "error",
          title: isSessionExpired ? "Session Expired" : "Request Failed",
          message: error.message || "Failed to submit subject request. Please try again.",
          isSessionExpired,
        });
      }
      return;
    }

    if (selectedValues.files.length === 0) {
      setModalState({
        type: "error",
        title: "No File Selected",
        message: "Please select a file to upload.",
      });
      return;
    }
    setModalState({ type: "uploading" });
    let finalFile = null;

    try {
      if (detectedType === "pdf") {
        finalFile = selectedValues.files[0]; // single PDF
      } else if (detectedType === "image") {
        finalFile = await createPdfFromImages(selectedValues.files); // merged PDF
      }

      if (finalFile.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
        throw new Error(
          `The combined PDF is larger than ${MAX_PDF_SIZE_MB}MB. Please use fewer or smaller images.`
        );
      }

      const finalCode = selectedValues.subject;
      const finalName =
        [...dynamicSubjects.current, ...dynamicSubjects.past].find((s) => s.code === finalCode)?.name || "";

      const formData = new FormData();
      formData.append("branch", selectedValues.branch);
      formData.append("semester", selectedValues.semester);
      formData.append("exam_session", selectedValues.session);
      formData.append("subject_code", finalCode);
      if (finalName) {
        formData.append("subject_name", finalName);
      }
      formData.append("year", selectedValues.year);
      formData.append("file", finalFile);

      await uploadFn(formData);
      setExistingPYQs((prev) => [
        ...prev,
        {
          year: Number(selectedValues.year),
          session: selectedValues.session,
          exam_session: selectedValues.session,
        },
      ]);
      setSelectedValues(initialState);
      setCustomSubjectCode("");
      setCustomSubjectName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (formRef.current) formRef.current.reset();
      setModalState({
        type: "success",
        title: "Upload Successful",
        message: "File Uploaded Successfully",
      });
    } catch (error) {
      const isSessionExpired = error.message?.toLowerCase().includes("session expired");
      setModalState({
        type: "error",
        title: isSessionExpired ? "Session Expired" : "Upload Failed",
        message: error.message || "Failed to upload file. Please try again.",
        isSessionExpired,
      });
    }
  }

  // Handle reset
  function handleReset(e) {
    e.preventDefault();
    setSelectedValues(initialState);
    setExistingPYQs([]);
    setCustomSubjectCode("");
    setCustomSubjectName("");
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className={styles.uploadPage}>
      <h1 className={styles.heading}>Contribute Question Papers Instantly.</h1>
      <p className={styles.subtitle}>
        Help students access better resources by uploading verified PYQs
      </p>
      <div className={styles.container}>
        <form
          id="pyqForm"
          ref={formRef}
          onSubmit={handleSubmit}
          onReset={handleReset}
          className={styles.form}
        >
          {/* Row 1: Semester, Branch, Subject */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="semester" className={styles.label}>
                Semester
              </label>
              <CustomSelect
                id="semester"
                name="semester"
                value={selectedValues.semester}
                placeholder="Select Semester"
                options={semesters.map((sem) => ({
                  value: String(sem),
                  label: `Semester ${sem}`,
                }))}
                required
                onChange={(val) => {
                  if (Number(val) > 2) {
                    setSelectedValues((prev) => ({
                      ...prev,
                      semester: val,
                      branch: "",
                      subject: "",
                    }));
                  } else {
                    setSelectedValues((prev) => ({
                      ...prev,
                      semester: val,
                      branch: "CommonForAllBranches",
                      subject: "",
                    }));
                  }
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="branch" className={styles.label}>
                Branch
              </label>
              <CustomSelect
                id="branch"
                name="branch"
                align="right"
                value={selectedValues.branch}
                placeholder="Select Branch"
                options={
                  selectedValues.semester === "1" || selectedValues.semester === "2"
                    ? [{ value: "CommonForAllBranches", label: "Common For All Branches" }]
                    : Object.entries(branches).map(([short, full]) => ({
                        value: short,
                        label: full,
                      }))
                }
                required
                disabled={!selectedValues.semester}
                onChange={(val) =>
                  setSelectedValues((prev) => ({
                    ...prev,
                    branch: val,
                    subject: "",
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="subject" className={styles.label}>
                Subject
              </label>
              <CustomSelect
                id="subject"
                name="subject"
                align="right"
                value={selectedValues.subject}
                placeholder={
                  !selectedValues.branch
                    ? "Select Branch First"
                    : loadingSubjects
                    ? "Loading subjects..."
                    : "Select Subject"
                }
                options={subjectsToShow}
                required
                disabled={!selectedValues.branch || loadingSubjects}
                onChange={(val) => {
                  setSelectedValues((prev) => ({
                    ...prev,
                    subject: val,
                    year: "",
                    session: "",
                  }));
                  if (val !== "__UNLISTED__") {
                    setCustomSubjectCode("");
                    setCustomSubjectName("");
                  }
                }}
              />
            </div>
          </div>

          {/* Unlisted Subject Request Section */}
          {isUnlistedSubject ? (
            <div className={styles.unlistedRequestContainer}>
              <div className={styles.unlistedInfoBanner}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div>
                  <h4 className={styles.unlistedInfoTitle}>Request a Past or Unlisted Subject</h4>
                  <p className={styles.unlistedInfoText}>
                    To prevent invalid uploads, unlisted subjects must be verified by administrators.
                    Once approved, this subject will appear under "Past / Previously Taught Subjects" in the dropdown,
                    and you will receive an email notification so you can upload the question papers!
                  </p>
                </div>
              </div>

              <div className={styles.formRow} style={{ marginTop: "4px" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Subject Code</label>
                  <input
                    type="text"
                    className={styles.manualYear}
                    placeholder="e.g. CS701M or CS61"
                    value={customSubjectCode}
                    onChange={(e) => setCustomSubjectCode(e.target.value.toUpperCase())}
                    required
                  />
                  <span className={styles.fieldHint}>Official university course code</span>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Subject Name</label>
                  <input
                    type="text"
                    className={styles.manualYear}
                    placeholder="e.g. Cryptography & Network Security"
                    value={customSubjectName}
                    onChange={(e) => setCustomSubjectName(e.target.value)}
                    required
                  />
                  <span className={styles.fieldHint}>Full course title as on syllabus</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Row 2: Year, Session, Upload Papers */}
              <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="year" className={styles.label}>Year</label>
              <CustomSelect
                id="year"
                name="year"
                value={selectedValues.year}
                placeholder={
                  !selectedValues.subject
                    ? "Select Subject First"
                    : loadingExistingPYQs
                    ? "Checking existing PYQs..."
                    : availableYears.length === 0
                    ? "All Years Uploaded"
                    : "Select Year"
                }
                options={availableYears.map((y) => ({ value: String(y), label: String(y) }))}
                required
                disabled={!selectedValues.subject || loadingExistingPYQs || availableYears.length === 0}
                onChange={(val) =>
                  setSelectedValues((prev) => ({
                    ...prev,
                    year: val,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="session" className={styles.label}>
                Session
              </label>
              <CustomSelect
                id="session"
                name="session"
                align="right"
                value={selectedValues.session}
                placeholder={
                  !selectedValues.year
                    ? "Select Year First"
                    : availableSessions.length === 0
                    ? "All Sessions Uploaded"
                    : "Select Session"
                }
                options={availableSessions}
                required
                disabled={!selectedValues.year || availableSessions.length === 0}
                onChange={(val) => {
                  setSelectedValues((prev) => ({
                    ...prev,
                    session: val,
                  }));
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Upload Papers</label>

              {selectedValues.files.length > 0 ? (
                <>
                  {detectedType === "pdf" ? (
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>
                        {selectedValues.files[0].name}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveFiles}
                        className={styles.removeBtn}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className={styles.fileSummary}>
                      <span className={styles.fileSummaryText}>
                        {selectedValues.files.length} image{selectedValues.files.length > 1 ? "s" : ""} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowOverlay(true)}
                        className={styles.editBtn}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFiles}
                        className={styles.removeBtn}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="file"
                    id="uploadFile"
                    style={{ display: "none" }}
                    name="uploadFile"
                    accept=".pdf,image/png,image/jpeg"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    className={styles.customFileInputBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className={styles.uploadIconMini}>📁</span>
                    <span>Choose PDF or Images</span>
                  </button>
                </>
              )}

              {errorMessage && (
                <p style={{ color: "#ff6b6b", marginTop: "5px", fontSize: "13px" }}>{errorMessage}</p>
              )}
            </div>
          </div>

          {selectedValues.subject && selectedValues.subject !== "__UNLISTED__" && !loadingExistingPYQs && availableYears.length === 0 && (
            <div className={styles.unlistedInfoBanner} style={{ marginTop: "16px", borderColor: "rgba(34, 197, 94, 0.4)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <h4 className={styles.unlistedInfoTitle} style={{ color: "#22c55e" }}>All Question Papers Uploaded</h4>
                <p className={styles.unlistedInfoText}>
                  All available exam sessions (April &amp; December) for this subject across the last 10 years are already in the database. Thank you for helping keep GetPYQ complete!
                </p>
              </div>
            </div>
          )}

          {/* Note on lower side of box */}
          <div className={styles.dbNote}>
            <span className={styles.dbNoteIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
            <span>
              Note: If a year or session is not listed, it is already present in the database.
            </span>
          </div>
            </>
          )}
        </form>
      </div>
      <div className={styles.buttonGroup}>
        <button
          type="submit"
          form="pyqForm"
          className={styles.submitBtn}
          disabled={isBusy || (!isUnlistedSubject && !!selectedValues.subject && availableYears.length === 0)}
        >
          {modalState?.type === "requesting"
            ? "Submitting Request..."
            : upload
            ? "Uploading..."
            : isUnlistedSubject
            ? "Submit Subject Request"
            : "Upload"}
        </button>
        <button type="reset" form="pyqForm" className={styles.resetBtn} disabled={isBusy}>
          Reset
        </button>
      </div>

      {/* Uploading, Requesting, Success, or Error modal */}
      {modalState && (
        <div
          className={styles.uploadOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isBusy) {
              handleCloseModal();
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          {modalState.type === "error" ? (
            <ErrorPage
              message={modalState.message}
              onClose={modalState.isSessionExpired ? handleSessionExpired : handleCloseModal}
            />
          ) : (
            <div className={styles.uploadCard}>
              {!isBusy && (
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={handleCloseModal}
                  aria-label="Close"
                >
                  ✕
                </button>
              )}

              {/* Uploading state */}
              {modalState.type === "uploading" && (
                <>
                  <div className={styles.spinner} />
                  <h3 className={styles.uploadTitle}>Uploading PYQ...</h3>
                  <p className={styles.uploadSubtitle}>
                    {detectedType === "image" && selectedValues.files.length > 1
                      ? "Converting images to PDF & uploading, please wait"
                      : "Uploading your question paper, please wait"}
                  </p>
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar} />
                  </div>
                </>
              )}

              {/* Requesting unlisted subject state */}
              {modalState.type === "requesting" && (
                <>
                  <div className={styles.spinner} />
                  <h3 className={styles.uploadTitle}>Submitting Request...</h3>
                  <p className={styles.uploadSubtitle}>
                    Sending subject details to administrators for approval, please wait
                  </p>
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar} />
                  </div>
                </>
              )}

              {/* Success state */}
              {modalState.type === "success" && (
                <>
                  <div className={styles.successIconWrapper}>
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <h3 className={styles.uploadTitle}>
                    {modalState.title || "Operation Successful"}
                  </h3>
                  <div className={styles.successDetails}>
                    <p className={styles.successMessage}>
                      {modalState.message || "Operation completed successfully."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.modalActionBtn}
                    onClick={handleCloseModal}
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image reorder overlay */}
      {showOverlay && detectedType === "image" && selectedValues.files.length > 0 && (
        <div className={styles.overlay} onClick={() => setShowOverlay(false)}>
          <div className={styles.overlayContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.overlayHeader}>
              <h2 className={styles.overlayTitle}>
                {selectedValues.files.length} image{selectedValues.files.length > 1 ? "s" : ""} — drag to reorder
              </h2>
              <button
                type="button"
                className={styles.overlayClose}
                onClick={() => setShowOverlay(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.overlayList}>
              {selectedValues.files.map((file, index) => (
                <div
                  key={file.name + index}
                  className={`${styles.imageItem} ${dragIndex === index ? styles.dragging : ""}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <span className={styles.dragHandle}>☰</span>
                  <img
                    src={thumbnailUrls[index]}
                    alt={file.name}
                    className={styles.thumbnail}
                  />
                  <span className={styles.imageFileName}>
                    {index + 1}. {file.name}
                  </span>
                  <button
                    type="button"
                    className={styles.removeOneBtn}
                    onClick={() => handleRemoveOne(index)}
                    title="Remove this image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.overlayFooter}>
              <button
                type="button"
                onClick={handleRemoveFiles}
                className={styles.removeBtn}
              >
                Remove All
              </button>
              <button
                type="button"
                onClick={() => setShowOverlay(false)}
                className={styles.overlayDoneBtn}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
