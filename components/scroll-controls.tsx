"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollControls() {
  const [{ progress, showBackToTop }, setScrollState] = useState({
    progress: 0,
    showBackToTop: false,
  });

  useEffect(() => {
    let frame = 0;

    function updateScrollState() {
      frame = 0;
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = scrollableHeight > 0
        ? Math.min(100, Math.max(0, (window.scrollY / scrollableHeight) * 100))
        : 0;
      const nextShowBackToTop = window.scrollY > 400;

      setScrollState((previous) =>
        previous.progress === nextProgress && previous.showBackToTop === nextShowBackToTop
          ? previous
          : { progress: nextProgress, showBackToTop: nextShowBackToTop },
      );
    }

    function scheduleUpdate() {
      if (!frame) frame = window.requestAnimationFrame(updateScrollState);
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(document.documentElement);
    scheduleUpdate();

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  function backToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <>
      <div
        role="progressbar"
        aria-label="Page reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-white/10"
      >
        <div
          className="h-full w-full origin-left bg-[var(--lime)]"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

      {showBackToTop && (
        <button
          type="button"
          onClick={backToTop}
          aria-label="Back to top"
          title="Back to top"
          className="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-[#071018]/15 bg-[var(--lime)] text-[#071018] shadow-lg transition hover:-translate-y-1 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#071018]"
        >
          <ArrowUp size={22} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
