import { useEffect, useState } from "react";
import { fetchSubjects } from "../http";
import { subjects as staticSubjects, ordinals } from "../information";

const EMPTY = { current: [], past: [] };

// Shared across the Download and Upload pages for the whole session: one request
// per branch+semester, concurrent callers share the in-flight promise.
const pending = new Map();
const resolved = new Map();

function cacheKey(branch, semester) {
  return `${branch}|${semester}`;
}

function loadSubjects(branch, semester) {
  const key = cacheKey(branch, semester);
  if (!pending.has(key)) {
    const promise = fetchSubjects(branch, semester)
      .then((data) => {
        const value = { current: data.current_subjects || [], past: data.past_subjects || [] };
        resolved.set(key, value);
        return value;
      })
      .catch((err) => {
        pending.delete(key); // allow a retry on the next selection
        throw err;
      });
    pending.set(key, promise);
  }
  return pending.get(key);
}

function staticFallback(branch, semester) {
  const list =
    Number(semester) <= 2
      ? staticSubjects.CommonForAllBranches?.[ordinals[semester]]
      : staticSubjects[branch]?.[ordinals[semester]];
  if (!list) return EMPTY;
  return { current: list.map((s) => ({ code: s[1], name: s[0] })), past: [] };
}

/** Subjects offered for a branch+semester, cached for the session. */
export default function useSubjects(branch, semester) {
  const [state, setState] = useState({ subjects: EMPTY, loading: false });

  useEffect(() => {
    if (!branch || !semester) {
      setState({ subjects: EMPTY, loading: false });
      return;
    }

    const cached = resolved.get(cacheKey(branch, semester));
    if (cached) {
      setState({ subjects: cached, loading: false });
      return;
    }

    let active = true;
    setState((prev) => ({ ...prev, loading: true }));
    loadSubjects(branch, semester)
      .then((subjects) => {
        if (active) setState({ subjects, loading: false });
      })
      .catch((err) => {
        console.warn("Failed to load dynamic subjects, falling back to static list", err);
        if (active) setState({ subjects: staticFallback(branch, semester), loading: false });
      });

    return () => {
      active = false;
    };
  }, [branch, semester]);

  return state;
}
