// Downloads question papers directly from R2 (presigned URLs) and merges them
// into one PDF in the browser, so file bytes never pass through the backend.

const CONCURRENCY = 4;

function abortError() {
  return new DOMException("Download cancelled", "AbortError");
}

/**
 * @param {Array<{url: string}>} papers  in the order they should appear in the PDF
 * @param {{signal?: AbortSignal, onProgress?: (p: {phase: string, done: number, total: number}) => void}} options
 * @returns {Promise<{blob: Blob|null, failed: Array, networkFailures: number}>}
 */
export async function mergePdfsFromUrls(papers, { signal, onProgress } = {}) {
  const total = papers.length;
  const buffers = new Array(total).fill(null);
  let networkFailures = 0;
  let done = 0;
  let next = 0;

  async function worker() {
    while (next < total) {
      const i = next++;
      try {
        const res = await fetch(papers[i].url, { signal });
        if (res.ok) {
          buffers[i] = await res.arrayBuffer();
        }
      } catch (err) {
        if (err.name === "AbortError") throw err;
        // TypeError here usually means a network/CORS failure rather than a missing file.
        networkFailures += 1;
      }
      done += 1;
      onProgress?.({ phase: "downloading", done, total });
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));
  if (signal?.aborted) throw abortError();

  const failed = papers.filter((_, i) => !buffers[i]);
  const available = buffers.filter(Boolean);
  if (available.length === 0) return { blob: null, failed, networkFailures };

  // A single paper needs no merging; hand the original file over untouched.
  if (available.length === 1) {
    return { blob: new Blob([available[0]], { type: "application/pdf" }), failed, networkFailures };
  }

  onProgress?.({ phase: "merging", done, total });
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();
  for (let i = 0; i < total; i++) {
    if (!buffers[i]) continue;
    if (signal?.aborted) throw abortError();
    try {
      const doc = await PDFDocument.load(buffers[i], { ignoreEncryption: true });
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    } catch {
      failed.push(papers[i]);
    }
    buffers[i] = null; // release memory as we go
  }

  if (merged.getPageCount() === 0) return { blob: null, failed, networkFailures };
  const bytes = await merged.save();
  return { blob: new Blob([bytes], { type: "application/pdf" }), failed, networkFailures };
}
