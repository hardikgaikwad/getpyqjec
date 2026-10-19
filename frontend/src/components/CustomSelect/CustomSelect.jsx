import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import styles from "./CustomSelect.module.css";

const LIST_MAX_HEIGHT = 280;
const LIST_MIN_HEIGHT = 120;
// Below this much room, flip upwards if there is more space above.
const LIST_COMFORT_HEIGHT = 200;
// Gap to the trigger + dropdown padding/border + a small margin from the screen edge.
const DROPDOWN_CHROME = 30;

export default function CustomSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Select Option",
  name,
  required = false,
  disabled = false,
  id,
  className = "",
  triggerClassName = "",
  dropdownClassName = "",
  align = "auto",
}) {

  const [isOpen, setIsOpen] = useState(false);
  const [computedAlign, setComputedAlign] = useState(align === "right" ? "right" : "left");
  const [placement, setPlacement] = useState({ up: false, maxHeight: LIST_MAX_HEIGHT });
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  // Open upwards when there isn't room below (e.g. fields near the bottom of a
  // one-screen layout), and never let the list run past the viewport edge.
  useLayoutEffect(() => {
    if (!isOpen || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_CHROME;
    // The sticky navbar would cover a list opened upwards past it.
    const navBottom = Math.max(0, document.querySelector("nav")?.getBoundingClientRect().bottom ?? 0);
    const spaceAbove = rect.top - navBottom - DROPDOWN_CHROME;
    const needed = Math.min(LIST_COMFORT_HEIGHT, listRef.current?.scrollHeight ?? LIST_COMFORT_HEIGHT);
    const up = spaceBelow < needed && spaceAbove > spaceBelow;
    const room = up ? spaceAbove : spaceBelow;
    setPlacement({ up, maxHeight: Math.max(LIST_MIN_HEIGHT, Math.min(LIST_MAX_HEIGHT, room)) });
  }, [isOpen]);

  // Compute dropdown alignment based on prop or viewport position
  useEffect(() => {
    if (!isOpen) return;

    if (align === "left" || align === "right") {
      setComputedAlign(align);
      return;
    }

    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      if (rect.right > windowWidth * 0.55 || rect.left + 360 > windowWidth - 20) {
        setComputedAlign("right");
      } else {
        setComputedAlign("left");
      }
    }
  }, [isOpen, align]);

  // Normalize options into { value, label, triggerLabel, icon, isHeader } array
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "object" && opt !== null) {
      if (Array.isArray(opt)) {
        // [label, value] format e.g. from information.js subjects
        return {
          label: opt[0],
          triggerLabel: opt[0],
          value: opt[1] !== undefined ? String(opt[1]) : String(opt[0]),
          icon: null,
          isHeader: false,
        };
      }
      return {
        label: opt.label !== undefined ? opt.label : String(opt.value),
        triggerLabel: opt.triggerLabel !== undefined ? opt.triggerLabel : (opt.label !== undefined ? opt.label : String(opt.value)),
        value: opt.value !== undefined ? String(opt.value) : "",
        isHeader: !!opt.isHeader || !!opt.disabled,
        icon: opt.icon || null,
        className: opt.className || "",
      };
    }
    return { label: String(opt), triggerLabel: String(opt), value: String(opt), icon: null, isHeader: false };
  });

  const selectedOption = normalizedOptions.find((opt) => !opt.isHeader && opt.value === String(value));


  // Close when clicking outside
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

  // Scroll to selected item when dropdown opens
  useEffect(() => {
    if (isOpen && listRef.current && selectedOption) {
      const selectedIndex = normalizedOptions.findIndex((opt) => opt.value === selectedOption.value);
      if (selectedIndex >= 0) {
        const itemEl = listRef.current.children[selectedIndex];
        if (itemEl) {
          itemEl.scrollIntoView({ block: "nearest" });
        }
      }
    }
  }, [isOpen, selectedOption, normalizedOptions]);

  const handleSelect = useCallback(
    (optValue) => {
      if (onChange) {
        onChange(optValue);
      }
      setIsOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = normalizedOptions.findIndex((opt) => opt.value === String(value));
        const nextIndex = Math.min(currentIndex + 1, normalizedOptions.length - 1);
        if (nextIndex >= 0) {
          handleSelect(normalizedOptions[nextIndex].value);
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = normalizedOptions.findIndex((opt) => opt.value === String(value));
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (prevIndex >= 0) {
          handleSelect(normalizedOptions[prevIndex].value);
        }
      }
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${isOpen ? styles.open : ""} ${disabled ? styles.disabled : ""} ${className}`}
    >
      {/* Hidden input to guarantee native form submission works */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value || ""}
          required={required && !value}
        />
      )}

      {/* Main Trigger Box */}
      <button
        type="button"
        id={id}
        className={`${styles.trigger} ${triggerClassName} ${!selectedOption ? styles.placeholder : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}

        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.selectedLabel}>
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className={styles.optionIcon}>{selectedOption.icon}</span>}
              <span className={styles.labelText}>{selectedOption.triggerLabel || selectedOption.label}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ""}`}>
          ▾
        </span>
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && !disabled && (
        <div
          className={`${styles.dropdown} ${
            computedAlign === "right" ? styles.alignRight : styles.alignLeft
          } ${placement.up ? styles.openUp : ""} ${dropdownClassName}`}
        >

          <div
            ref={listRef}
            className={styles.list}
            style={{ maxHeight: placement.maxHeight }}
            role="listbox"
          >
            {normalizedOptions.length === 0 ? (
              <div className={styles.emptyItem}>No options available</div>
            ) : (
              normalizedOptions.map((opt, idx) => {
                if (opt.isHeader) {
                  return (
                    <div key={`header-${idx}`} className={styles.headerItem}>
                      {opt.label}
                    </div>
                  );
                }
                const isSelected = selectedOption && selectedOption.value === opt.value;
                return (
                  <div
                    key={opt.value}
                    className={`${styles.item} ${isSelected ? styles.itemSelected : ""} ${opt.className || ""}`}
                    onClick={() => handleSelect(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className={styles.itemLabel}>
                      {opt.icon && <span className={styles.optionIcon}>{opt.icon}</span>}
                      <span className={styles.labelText}>{opt.label}</span>
                    </span>
                    {isSelected && <span className={styles.checkIcon}>✓</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
