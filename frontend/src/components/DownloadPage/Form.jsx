import { useState } from "react";
import styles from "./Form.module.css";
import {
  branches,
  subjects,
  semesters,
  previousYears,
  ordinals,
} from "../../information";

const initialState = {
  semester: "",
  branch: "",
  subject: "",
  fromYear: "",
  toYear: "",
};

export default function FormPYQ({ fetchFn }) {
  const [manualFromYear, setManualFromYear] = useState(false);
  const [manualToYear, setManualToYear] = useState(false);
  const [selectedValues, setSelectedValues] = useState(initialState);
  const [fetching, setFetching] = useState(false);
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
      setManualFromYear(false);
      setManualToYear(false);
      setSelectedValues({
        semester: "",
        branch: "",
      });
      event.target.reset();
    } catch (error) {
      throw error
    } finally {
      setFetching(false);
    }
  }
  function handleReset(e) {
    e.preventDefault();
    setManualFromYear(false);
    setManualToYear(false);
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
                  <option key={subject[0]} value={subject[1]}>
                    {subject[0]}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.yearGroup}>
                {manualFromYear ? (
                  <>
                    <label htmlFor="fromYearManual" className={styles.label}>
                      From Year
                    </label>
                    <input
                      type="text"
                      id="fromYearManual"
                      name="fromYear"
                      className={styles.manualYear}
                      placeholder="Enter year (e.g., 2024)"
                      pattern="[0-9]{4}"
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedValues((prev) => ({
                          ...prev,
                          fromYear: value,
                        }));
                        if (value < previousYears[4] && value >= 1000)
                          setManualToYear(true);
                      }}
                      autoFocus
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor="fromYear" className={styles.label}>
                      From Year
                    </label>
                    <select
                      id="fromYear"
                      name="fromYear"
                      className={`${styles.yearSelect} ${styles.select}`}
                      value={selectedValues.fromYear}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        if (selectedValue === "true") setManualFromYear(true);
                        else
                          setSelectedValues((prev) => ({
                            ...prev,
                            fromYear: selectedValue,
                          }));
                      }}
                      required
                    >
                      <option value="" disabled hidden>
                        Select Year
                      </option>
                      {previousYears.map((year) => {
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                      <option value="true">Type Manually</option>
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <div className={`${styles.yearGroup} ${styles.toYear}`}>
                {selectedValues.fromYear ? (
                  manualToYear ? (
                    <>
                      <label htmlFor="toYearManual" className={styles.label}>
                        To Year
                      </label>
                      <input
                        type="text"
                        id="toYearManual"
                        name="toYear"
                        className={styles.manualYear}
                        placeholder="Enter year (e.g., 2024)"
                        pattern="[0-9]{4}"
                        onChange={(e) =>
                          setSelectedValues((prev) => ({
                            ...prev,
                            toYear: e.target.value,
                          }))
                        }
                      />
                    </>
                  ) : (
                    <>
                      <label htmlFor="toYear" className={styles.label}>
                        To Year
                      </label>
                      <select
                        id="toYear"
                        name="toYear"
                        className={`${styles.yearSelect} ${styles.select}`}
                        value={selectedValues.toYear}
                        onChange={(e) => {
                          const selectValue = e.target.value;
                          if (selectValue === "true") setManualToYear(true);
                          else
                            setSelectedValues((prev) => ({
                              ...prev,
                              toYear: e.target.value,
                            }));
                        }}
                        required
                      >
                        <option value="" disabled hidden>
                          Select Year
                        </option>
                        {previousYears.map((year) => {
                          if (
                            year >= selectedValues.fromYear &&
                            selectedValues.fromYear >= previousYears[4]
                          )
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                        })}
                        <option value="true">Type Manually</option>
                      </select>
                    </>
                  )
                ) : (
                  <>
                    <label htmlFor="toYear" className={styles.label}>
                      To Year
                    </label>
                    <select
                      id="toYear"
                      name="toYear"
                      className={styles.select}
                      value={selectedValues.toYear}
                      onChange={(e) =>
                        setSelectedValues((prev) => ({
                          ...prev,
                          toYear: e.target.value,
                        }))
                      }
                      required
                    >
                      <option value="" disabled hidden>
                        First select "From Year"
                      </option>
                    </select>
                  </>
                )}
              </div>
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
