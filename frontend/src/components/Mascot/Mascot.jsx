import { useEffect, useRef } from "react";
import styles from "./Mascot.module.css";
import monkeyHead from "../../assets/mascot/monkey-head.png";
import pupilLeft from "../../assets/mascot/pupil-left.png";
import pupilRight from "../../assets/mascot/pupil-right.png";
import bookImg from "../../assets/mascot/book.png";

export default function Mascot() {
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);

  useEffect(() => {
    // Check reduced motion preference
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = motionQuery.matches;

    const handleMotionChange = (e) => {
      prefersReducedMotion = e.matches;
      if (prefersReducedMotion) {
        if (leftPupilRef.current) leftPupilRef.current.style.transform = "translate3d(0, 0, 0)";
        if (rightPupilRef.current) rightPupilRef.current.style.transform = "translate3d(0, 0, 0)";
      }
    };
    motionQuery.addEventListener?.("change", handleMotionChange);

    if (prefersReducedMotion) {
      return () => {
        motionQuery.removeEventListener?.("change", handleMotionChange);
      };
    }

    // Animation & physics state
    let animId = null;
    let isRunning = false;
    const mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const eyeState = {
      left: { currX: 0, currY: 0, targetX: 0, targetY: 0 },
      right: { currX: 0, currY: 0, targetX: 0, targetY: 0 },
    };

    function updateTargets() {
      // Left eye tracking
      if (leftEyeRef.current) {
        const rect = leftEyeRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = mousePos.x - cx;
        const dy = mousePos.y - cy;
        const dist = Math.hypot(dx, dy);
        // Max travel radius inside white lens
        const maxR = Math.min(Math.max(8, rect.width * 0.75), 15);

        if (dist > 1) {
          const moveDist = Math.min(dist * 0.05, maxR);
          eyeState.left.targetX = (dx / dist) * moveDist;
          eyeState.left.targetY = (dy / dist) * moveDist;
        } else {
          eyeState.left.targetX = 0;
          eyeState.left.targetY = 0;
        }
      }

      // Right eye tracking
      if (rightEyeRef.current) {
        const rect = rightEyeRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = mousePos.x - cx;
        const dy = mousePos.y - cy;
        const dist = Math.hypot(dx, dy);
        const maxR = Math.min(Math.max(8, rect.width * 0.75), 15);

        if (dist > 1) {
          const moveDist = Math.min(dist * 0.05, maxR);
          eyeState.right.targetX = (dx / dist) * moveDist;
          eyeState.right.targetY = (dy / dist) * moveDist;
        } else {
          eyeState.right.targetX = 0;
          eyeState.right.targetY = 0;
        }
      }
    }

    function renderLoop() {
      const lerp = 0.18;

      const diffLx = eyeState.left.targetX - eyeState.left.currX;
      const diffLy = eyeState.left.targetY - eyeState.left.currY;
      const diffRx = eyeState.right.targetX - eyeState.right.currX;
      const diffRy = eyeState.right.targetY - eyeState.right.currY;

      eyeState.left.currX += diffLx * lerp;
      eyeState.left.currY += diffLy * lerp;
      eyeState.right.currX += diffRx * lerp;
      eyeState.right.currY += diffRy * lerp;

      if (leftPupilRef.current) {
        leftPupilRef.current.style.transform = `translate3d(${eyeState.left.currX.toFixed(2)}px, ${eyeState.left.currY.toFixed(2)}px, 0)`;
      }
      if (rightPupilRef.current) {
        rightPupilRef.current.style.transform = `translate3d(${eyeState.right.currX.toFixed(2)}px, ${eyeState.right.currY.toFixed(2)}px, 0)`;
      }

      const totalDiff =
        Math.abs(diffLx) + Math.abs(diffLy) + Math.abs(diffRx) + Math.abs(diffRy);

      if (totalDiff > 0.03) {
        animId = requestAnimationFrame(renderLoop);
      } else {
        isRunning = false;
      }
    }

    function wakeLoop() {
      if (!isRunning) {
        isRunning = true;
        animId = requestAnimationFrame(renderLoop);
      }
    }

    function onPointerMove(e) {
      if (typeof e.clientX === "number") {
        mousePos.x = e.clientX;
        mousePos.y = e.clientY;
        updateTargets();
        wakeLoop();
      }
    }

    function onScrollOrResize() {
      updateTargets();
      wakeLoop();
    }

    // Attach to window and document to catch all mouse/pointer events across the page
    window.addEventListener("mousemove", onPointerMove, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("mousemove", onPointerMove, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true });

    // Initial position
    updateTargets();
    wakeLoop();

    return () => {
      if (animId) cancelAnimationFrame(animId);
      motionQuery.removeEventListener?.("change", handleMotionChange);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize);
    };
  }, []);

  return (
    <div className={styles.mascotRoot} aria-hidden="true">
      {/* ── Monkey Head & Book (Positioned behind top of filter panel) ── */}
      <div className={styles.headAssembly}>
        {/* Open Book */}
        <div className={styles.bookWrapper}>
          <img
            src={bookImg}
            alt=""
            className={styles.bookImg}
            draggable="false"
          />
        </div>

        {/* Monkey Head with dynamic eyes */}
        <div className={styles.headWrapper}>
          <img
            src={monkeyHead}
            alt=""
            className={styles.headImg}
            draggable="false"
          />

          {/* Eye tracking anchors and pupils */}
          <div ref={leftEyeRef} className={styles.leftEyeRegion}>
            <img
              ref={leftPupilRef}
              src={pupilLeft}
              alt=""
              className={styles.pupilImg}
              draggable="false"
            />
          </div>

          <div ref={rightEyeRef} className={styles.rightEyeRegion}>
            <img
              ref={rightPupilRef}
              src={pupilRight}
              alt=""
              className={styles.pupilImg}
              draggable="false"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
