import { useState, useMemo } from "react";
import styles from "./Form.module.css";
import {
  branches,
  subjects,
  semesters,
  ordinals,
} from "../../information";
import ScrollYearPicker from "../ScrollYearPicker/ScrollYearPicker";

const initialState = {
  semester: "",
  branch: "",
  subject: "",
  fromYear: "",
  toYear: "",
};

// Generate current year + last 10 years (descending)
const currentYear = new Date().getFullYear();
const allYears = Array.from({ length: 11 }, (_, i) => currentYear - i);

export default function FormPYQ({ fetchFn }) {
  const [selectedValues, setSelectedValues] = useState(initialState);
  const [fetching, setFetching] = useState(false);

  // toYear options: only years >= fromYear
  const toYearOptions = useMemo(() => {
    if (!selectedValues.fromYear) return allYears;
    return allYears.filter((y) => y >= Number(selectedValues.fromYear));
  }, [selectedValues.fromYear]);
  const subjectsToShow = [];

  if (selectedValues.semester && selectedValues.branch) {
    const sem = selectedValues.semester;
    const branch = selectedValues.branch;
    subjectsToShow.push(
      ["ALL SUBJECTS", "All"],
      ...subjects[branch][ordinals[sem]],
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFetching(true);
    try {
      const fd = new FormData(event.target);
      const data = Object.fromEntries(fd.entries());
      const queryString = new URLSearchParams(data).toString();
      await fetchFn(queryString);
      setSelectedValues({
        semester: "",
        branch: "",
        subject: "",
        fromYear: "",
        toYear: "",
      });
    } catch (error) {
      setSelectedValues({
        semester: "",
        branch: "",
        subject: "",
        fromYear: "",
        toYear: "",
      });
      throw error;
    } finally {
      setFetching(false);
    }
  }
  function handleReset(e) {
    e.preventDefault();
    setSelectedValues(initialState);
    e.target.reset();
  }

  return (
    <div className={styles.downloadPage}>
      <div className={styles.container}>
        <h1 className={styles.heading}>GETPYQJEC</h1>
        <form
          id="pyqForm"
          onSubmit={handleSubmit}
          onReset={handleReset}
          className={styles.form}
        >
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

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="subject" className={styles.label}>
                Subject
              </label>
              <select
                id="subject"
                name="subject_code"
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
                  <option key={subject[0]} value={subject[1]}>
                    {subject[0]}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>From Year</label>
              <ScrollYearPicker
                years={allYears}
                value={selectedValues.fromYear}
                name="from_year"
                onChange={(val) =>
                  setSelectedValues((prev) => ({
                    ...prev,
                    fromYear: val,
                    toYear: prev.toYear && Number(prev.toYear) < Number(val) ? val : prev.toYear,
                  }))
                }
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: "0 1 calc(50% - 7.5px)" }}>
              <label className={styles.label}>To Year</label>
              <ScrollYearPicker
                years={toYearOptions}
                value={selectedValues.toYear}
                name="to_year"
                onChange={(val) =>
                  setSelectedValues((prev) => ({
                    ...prev,
                    toYear: val,
                  }))
                }
              />
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={fetching}
            >
              {fetching ? "Sending Request..." : "Submit"}
            </button>
            <button type="reset" className={styles.resetBtn}>
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
