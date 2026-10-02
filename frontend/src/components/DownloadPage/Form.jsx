import { useState, useMemo, useEffect } from "react";
import styles from "./Form.module.css";
import {
  branches,
  subjects,
  semesters,
  ordinals,
} from "../../information";
import { fetchSubjects } from "../../http";
import CustomSelect from "../CustomSelect/CustomSelect";
import Mascot from "../Mascot/Mascot";

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

  const branchOptions = useMemo(() => {
    if (selectedValues.semester === "1" || selectedValues.semester === "2") {
      return [{ value: "CommonForAllBranches", label: "Common For All Branches" }];
    }
    return Object.entries(branches).map(([short, full]) => ({
      value: short,
      label: full,
    }));
  }, [selectedValues.semester]);

  const [dynamicSubjects, setDynamicSubjects] = useState({ current: [], past: [] });
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  useEffect(() => {
    if (!selectedValues.semester || !selectedValues.branch) {
      setDynamicSubjects({ current: [], past: [] });
      return;
    }

    let isMounted = true;
    setLoadingSubjects(true);

    fetchSubjects(selectedValues.branch, selectedValues.semester)
      .then((data) => {
        if (isMounted) {
          setDynamicSubjects({
            current: data.current_subjects || [],
            past: data.past_subjects || [],
          });
        }
      })
      .catch((err) => {
        console.warn("Failed to load dynamic subjects, falling back to static list", err);
        const sem = selectedValues.semester;
        const branch = selectedValues.branch;
        const branchSubjects =
          Number(sem) <= 2
            ? subjects.CommonForAllBranches?.[ordinals[sem]]
            : subjects[branch]?.[ordinals[sem]];
        if (isMounted && branchSubjects) {
          setDynamicSubjects({
            current: branchSubjects.map((s) => ({ code: s[1], name: s[0] })),
            past: [],
          });
        }
      })
      .finally(() => {
        if (isMounted) setLoadingSubjects(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedValues.branch, selectedValues.semester]);

  const subjectsToShow = useMemo(() => {
    if (!selectedValues.semester || !selectedValues.branch) return [];

    const options = [{ value: "All", label: "ALL SUBJECTS" }];

    if (dynamicSubjects.current.length > 0) {
      if (dynamicSubjects.past.length > 0) {
        options.push({ label: "── Current Curriculum ──", isHeader: true });
      }
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

    return options;
  }, [selectedValues.semester, selectedValues.branch, dynamicSubjects]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFetching(true);
    try {
      const fd = new FormData(event.target);
      const data = Object.fromEntries(fd.entries());
      const queryString = new URLSearchParams(data).toString();
      await fetchFn(queryString);
    } catch {
      // Retain user's selected values on error so they can adjust filters
    } finally {
      setFetching(false);
    }
  }

  function handleReset(e) {
    e.preventDefault();
    setSelectedValues(initialState);
  }

  return (
    <div className={styles.downloadPage}>
      <h1 className={styles.heading}>Find Previous Year Question Papers Instantly.</h1>
      <p className={styles.subtitle}>Curated engineering resources, filters by semester, branch & subject.</p>
      <div className={styles.mascotPanelWrapper}>
        <Mascot />
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
                <CustomSelect
                  id="semester"
                  name="semester"
                  value={selectedValues.semester}
                  placeholder="Select Semester"
                  options={semesters.map((s) => ({ value: String(s), label: `Semester ${s}` }))}
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
                  value={selectedValues.branch}
                  placeholder="Select Branch"
                  options={branchOptions}
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
                  name="subject_code"
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
                  onChange={(val) =>
                    setSelectedValues((prev) => ({
                      ...prev,
                      subject: val,
                    }))
                  }
                />
              </div>
            </div>

            {/* Row 2: From Year, To Year */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>From Year</label>
                <CustomSelect
                  name="from_year"
                  value={selectedValues.fromYear}
                  placeholder="Select From Year"
                  options={allYears.map((y) => ({ value: String(y), label: String(y) }))}
                  required
                  onChange={(val) =>
                    setSelectedValues((prev) => ({
                      ...prev,
                      fromYear: val,
                      toYear: prev.toYear && Number(prev.toYear) < Number(val) ? val : prev.toYear,
                    }))
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>To Year</label>
                <CustomSelect
                  name="to_year"
                  value={selectedValues.toYear}
                  placeholder="Select To Year"
                  options={toYearOptions.map((y) => ({ value: String(y), label: String(y) }))}
                  required
                  onChange={(val) =>
                    setSelectedValues((prev) => ({
                      ...prev,
                      toYear: val,
                    }))
                  }
                />
              </div>

              {/* Empty spacer to align with the 3-column row above */}
              <div className={styles.formGroup} style={{ visibility: "hidden" }}></div>
            </div>
          </form>
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button
          type="submit"
          form="pyqForm"
          className={styles.submitBtn}
          disabled={fetching}
        >
          {fetching ? "Sending Request..." : "Submit"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={styles.resetBtn}
          disabled={fetching}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
