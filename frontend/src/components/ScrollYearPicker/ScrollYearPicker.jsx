import { useRef, useEffect, useState, useCallback } from "react";
import styles from "./ScrollYearPicker.module.css";

const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 3;

export default function ScrollYearPicker({ years, value, onChange, name }) {
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef(null);
  const wrapperRef = useRef(null);
  const [centerIndex, setCenterIndex] = useState(() => {
    const idx = years.indexOf(Number(value));
    return idx >= 0 ? idx : 0;
  });

  const padding = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Scroll to selected value when picker opens
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const idx = years.indexOf(Number(value));
    if (idx >= 0) {
      listRef.current.scrollTop = idx * ITEM_HEIGHT;
      setCenterIndex(idx);
    } else {
      listRef.current.scrollTop = 0;
      setCenterIndex(0);
      if (years.length > 0) onChange(String(years[0]));
    }
  }, [isOpen, years]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const idx = Math.round(listRef.current.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(idx, years.length - 1));
    setCenterIndex(clamped);
    if (String(years[clamped]) !== String(value)) {
      onChange(String(years[clamped]));
    }
  }, [years, value, onChange]);

  // Click a year item → select it and close
  function handleItemClick(index) {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: "smooth",
    });
    onChange(String(years[index]));
    setCenterIndex(index);
    setTimeout(() => setIsOpen(false), 200);
  }

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      {/* Hidden input for FormData */}
      <input type="hidden" name={name} value={value || ""} />

      {/* Trigger — looks identical to other selects because it is a native select */}
      <div
        className={styles.triggerWrapper}
        onClick={() => setIsOpen((prev) => !prev)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <select
          className={styles.trigger}
          value={value || ""}
          onChange={() => {}}
          tabIndex={-1}
        >
          <option value={value || ""}>{value || "Select Year"}</option>
        </select>
      </div>

      {/* Popup picker */}
      {isOpen && (
        <div className={styles.popup}>
          <div
            className={styles.picker}
            style={{ height: ITEM_HEIGHT * VISIBLE_COUNT }}
          >
            <div
              className={styles.highlight}
              style={{ top: padding, height: ITEM_HEIGHT }}
            />
            <div className={styles.fadeTop} style={{ height: padding }} />
            <div className={styles.fadeBottom} style={{ height: padding }} />

            <div
              ref={listRef}
              className={styles.list}
              onScroll={handleScroll}
            >
              <div style={{ height: padding }} />
              {years.map((year, i) => {
                const dist = Math.abs(i - centerIndex);
                return (
                  <div
                    key={year}
                    className={styles.item}
                    onClick={() => handleItemClick(i)}
                    style={{
                      height: ITEM_HEIGHT,
                      opacity: Math.max(0.15, 1 - dist * 0.35),
                      transform: `scale(${Math.max(0.7, 1 - dist * 0.13)})`,
                      fontWeight: dist === 0 ? 700 : 400,
                    }}
                  >
                    {year}
                  </div>
                );
              })}
              <div style={{ height: padding }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
