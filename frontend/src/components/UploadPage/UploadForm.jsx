import { useState, useRef, useMemo } from "react";
import styles from "./UploadForm.module.css";
import {
  branches,
  subjects,
  semesters,
  ordinals,
} from "../../information";
import createPdfFromImages from "../../imgTopdf";
import ScrollYearPicker from "../ScrollYearPicker/ScrollYearPicker";

// Generate current year + last 10 years (descending)
const currentYear = new Date().getFullYear();
const allYears = Array.from({ length: 11 }, (_, i) => currentYear - i);

const initialState = {
  semester: "",
  branch: "",
  session: "",
  subject: "",
  year: "",
  files: [], // can be 1 PDF or multiple images
};

export default function UploadFormPYQ({ uploadFn }) {
  const [selectedValues, setSelectedValues] = useState(initialState);
  const [errorMessage, setErrorMessage] = useState("");
  const [upload, setUpload] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const fileInputRef = useRef(null);

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

  const subjectsToShow = [];
  if (selectedValues.semester && selectedValues.branch) {
    const sem = selectedValues.semester;
    const branch = selectedValues.branch;
    subjectsToShow.push(
      ["ALL SUBJECTS", "All"],
      ...subjects[branch][ordinals[sem]],
    );
  }

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
      if (selectedFiles[0].size > 5 * 1024 * 1024) {
        setErrorMessage("PDF size must be ≤ 5MB.");
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
    if (selectedValues.files.length === 0) {
      alert("Please select a file to upload.");
      return;
    }
    setUpload(true);
    let finalFile = null;

    if (detectedType === "pdf") {
      finalFile = selectedValues.files[0]; // single PDF
    } else if (detectedType === "image") {
      finalFile = await createPdfFromImages(selectedValues.files); // merged PDF
    }

    const formData = new FormData();
    formData.append("branch", selectedValues.branch);
    formData.append("semester", selectedValues.semester);
    formData.append("exam_session", selectedValues.session);
    formData.append("subject_code", selectedValues.subject);
    formData.append("year", selectedValues.year);
    formData.append("file", finalFile);

    try {
      await uploadFn(formData);
      setSelectedValues(initialState);
      event.target.reset();
      setUpload(false);
      alert("File Uploaded Successfully");
    } catch (error) {
      setSelectedValues(initialState);
      event.target.reset();
      setUpload(false);
    }
  }

  // Handle reset
  function handleReset(e) {
    e.preventDefault();
    setSelectedValues(initialState);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    e.target.reset();
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
              <select
                id="semester"
                name="semester"
                value={selectedValues.semester}
                className={styles.select}
                required
                onChange={(e) => {
                  const value = e.target.value;
                  if (Number(value) > 2) {
                    setSelectedValues((prev) => ({
                      ...prev,
                      semester: value,
                      branch: "",
                      subject: "",
                    }));
                  } else {
                    setSelectedValues((prev) => ({
                      ...prev,
                      semester: value,
                      branch: "CommonForAllBranches",
                      subject: "",
                    }));
                  }
                }}
              >
                <option value="" disabled hidden>
                  Select Semester
                </option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="branch" className={styles.label}>
                Branch
              </label>
              <select
                id="branch"
                name="branch"
                value={selectedValues.branch}
                className={styles.select}
                required
                onChange={(e) =>
                  setSelectedValues((prev) => ({
                    ...prev,
                    branch: e.target.value,
                    subject: "",
                  }))
                }
              >
                {selectedValues.semester == 1 ||
                selectedValues.semester == 2 ? (
                  <option value="CommonForAllBranches">
                    Common For All Branches
                  </option>
                ) : (
                  <>
                    <option value="" disabled hidden>
                      Select Branch
                    </option>
                    {Object.entries(branches).map(([short, full]) => {
                      return (
                        <option key={short} value={short}>
                          {full}
                        </option>
                      );
                    })}
                  </>
                )}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="subject" className={styles.label}>
                Subject
              </label>
              <select
                id="subject"
                name="subject"
                value={selectedValues.subject}
                className={styles.select}
                onChange={(e) =>
                  setSelectedValues((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                required
              >
                <option value="" disabled hidden>
                  Select the subject
                </option>
                {subjectsToShow.map((subject) => (
                  <option key={subject[0]} value={subject[1]}>
                    {subject[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Year, Session, Upload Papers */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Year</label>
              <ScrollYearPicker
                years={allYears}
                value={selectedValues.year}
                name="year"
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
              <select
                id="session"
                name="session"
                value={selectedValues.session}
                className={styles.select}
                required
                onChange={(e) => {
                  setSelectedValues((prev) => ({
                    ...prev,
                    session: e.target.value,
                  }));
                }}
              >
                <option value="" disabled hidden>
                  Select Session
                </option>
                <option value="April">April</option>
                <option value="December">December</option>
              </select>
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
                <input
                  type="file"
                  id="uploadFile"
                  className={styles.pdfFile}
                  name="uploadFile"
                  accept=".pdf,image/png,image/jpeg"
                  multiple
                  required
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              )}

              {errorMessage && (
                <p style={{ color: "#ff6b6b", marginTop: "5px", fontSize: "13px" }}>{errorMessage}</p>
              )}
            </div>
          </div>

        </form>
      </div>
      <div className={styles.buttonGroup}>
        <button
          type="submit"
          form="pyqForm"
          className={styles.submitBtn}
          disabled={upload}
        >
          {upload ? "Uploading..." : "Submit"}
        </button>
        <button type="reset" form="pyqForm" className={styles.resetBtn} disabled={upload}>
          Reset
        </button>
      </div>

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
