import { useState, useRef } from "react";
import styles from "./UploadForm.module.css";
import {
  branches,
  subjects,
  semesters,
  years,
  ordinals,
} from "../../information";
import createPdfFromImages from "../../imgTopdf";

const initialState = {
  semester: "",
  branch: "",
  session: "",
  subject: "",
  year: "",
  files: [], // can be 1 PDF or multiple images
};

export default function UploadFormPYQ({ uploadFn }) {
  const [manualYear, setManualYear] = useState(false);
  const [selectedValues, setSelectedValues] = useState(initialState);
  const [fileType, setFileType] = useState("pdf");
  const [errorMessage, setErrorMessage] = useState("");
  const [upload, setUpload] = useState(false);
  const fileInputRef = useRef(null);

  const subjectsToShow = [];
  if (selectedValues.semester && selectedValues.branch) {
    const sem = selectedValues.semester;
    const branch = selectedValues.branch;
    subjectsToShow.push(...subjects[branch][ordinals[sem]]);
  }

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setErrorMessage("");

    if (fileType === "pdf") {
      if (selectedFiles.length > 1) {
        setErrorMessage("You can upload only 1 PDF file.");
        return;
      }
      if (selectedFiles[0].size > 5 * 1024 * 1024) {
        setErrorMessage("PDF size must be ≤ 5MB.");
        return;
      }
    } else if (fileType === "image") {
      if (selectedFiles.length > 6) {
        setErrorMessage("You can upload up to 6 images only.");
        return;
      }
      for (const file of selectedFiles) {
        if (file.size > 2 * 1024 * 1024) {
          setErrorMessage(`${file.name} exceeds 2MB size limit.`);
          return;
        }
        if (!["image/png", "image/jpeg"].includes(file.type)) {
          setErrorMessage(`${file.name} is not a PNG/JPG image.`);
          return;
        }
      }
    }

    setSelectedValues((prev) => ({
      ...prev,
      files: selectedFiles,
    }));
  };

  // Remove files
  const handleRemoveFiles = () => {
    setSelectedValues((prev) => ({
      ...prev,
      files: [],
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

    if (fileType === "pdf") {
      finalFile = selectedValues.files[0]; // single PDF
    } else if (fileType === "image") {
      finalFile = await createPdfFromImages(selectedValues.files); // merged PDF
    }

    const formData = new FormData();
    formData.append("branch", selectedValues.branch);
    formData.append("semester", selectedValues.semester);
    formData.append("session", selectedValues.session);
    formData.append("subject", selectedValues.subject);
    formData.append("year", selectedValues.year);
    formData.append("pdfFile", finalFile);

    try {
      await uploadFn(formData);
      setManualYear(false);
      setSelectedValues(initialState);
      event.target.reset();
      setUpload(false);
      alert("File Uploaded Successfully");
    } catch (error) {
      setManualYear(false);
      setSelectedValues(initialState);
      event.target.reset();
      setUpload(false);
    }
  }

  // Handle reset
  function handleReset(e) {
    e.preventDefault();
    setManualYear(false);
    setSelectedValues(initialState);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    e.target.reset();
  }

  return (
    <div className={styles.uploadPage}>
      <div className={styles.container}>
        <h1 className={styles.heading}>UPLOAD</h1>
        <form
          id="pyqForm"
          onSubmit={handleSubmit}
          onReset={handleReset}
          className={styles.form}
        >
          {/* Semester & Branch */}
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
          </div>

          {/* Subject & Session */}
          <div className={styles.formRow}>
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
                  {selectedValues.branch && selectedValues.semester
                    ? "Select the subject"
                    : "Select branch and semester first"}
                </option>
                {subjectsToShow.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
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
          </div>

          {/* Year */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <div className={styles.yearGroup}>
                {manualYear ? (
                  <>
                    <label htmlFor="yearManual" className={styles.label}>
                      Year
                    </label>
                    <input
                      type="number"
                      id="yearManual"
                      name="yearManual"
                      className={styles.manualYear}
                      placeholder="Enter year (e.g., 2025)"
                      min="1900"
                      max={years[0]}
                      onChange={(e) => {
                        setSelectedValues((prev) => ({
                          ...prev,
                          year: e.target.value, // this is already a string
                        }));
                      }}
                      autoFocus
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor="year" className={styles.label}>
                      Year
                    </label>
                    <select
                      id="year"
                      name="year"
                      className={`${styles.yearSelect} ${styles.select}`}
                      value={selectedValues.year}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        if (selectedValue === "true") setManualYear(true);
                        else
                          setSelectedValues((prev) => ({
                            ...prev,
                            year: selectedValue,
                          }));
                      }}
                      required
                    >
                      <option value="" disabled hidden>
                        Select Year
                      </option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                      <option value="true">Type Manually</option>
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* File Upload */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Upload File</label>

              {/* File Type Choice */}
              <select
                value={fileType}
                onChange={(e) => {
                  setFileType(e.target.value);
                  setSelectedValues((prev) => ({ ...prev, files: [] }));
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className={styles.select}
              >
                <option value="pdf">PDF</option>
                <option value="image">Images (PNG/JPG)</option>
              </select>

              {selectedValues.files.length > 0 ? (
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>
                    {fileType === "pdf"
                      ? selectedValues.files[0].name
                      : `${selectedValues.files.length} images selected`}
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
                <input
                  type="file"
                  id="uploadFile"
                  className={styles.pdfFile}
                  name="uploadFile"
                  accept={fileType === "pdf" ? ".pdf" : "image/png,image/jpeg"}
                  multiple={fileType === "image"}
                  required
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              )}

              {errorMessage && (
                <p style={{ color: "red", marginTop: "5px" }}>{errorMessage}</p>
              )}
            </div>
          </div>

          {/* Submit & Reset */}
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={upload}
            >
              {upload ? "Uploading..." : "Upload"}
            </button>
            <button type="reset" className={styles.resetBtn} disabled={upload}>
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
