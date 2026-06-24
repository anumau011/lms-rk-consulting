import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfViewer({ url }) {
  const containerRef = useRef();
  const wrapperRef = useRef();
  const scrollRef = useRef(); // ← new: the actual scroll box around canvases only
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!url) return;

    setIsLoading(true);
    setIsSlow(false);

    const slowTimer = setTimeout(() => setIsSlow(true), 20000);

    let cancelled = false;
    let loadingTask = null;

    const loadPdf = async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        containerRef.current.innerHTML = "";

        const devicePixelRatio = window.devicePixelRatio || 1;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          if (cancelled) return;

          const viewport = page.getViewport({ scale: 1 });

          const A4_WIDTH = 800;
          const scale = A4_WIDTH / viewport.width;
          const scaledViewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = scaledViewport.width * devicePixelRatio;
          canvas.height = scaledViewport.height * devicePixelRatio;

          canvas.style.width = `${scaledViewport.width}px`;
          canvas.style.display = "block";
          canvas.style.margin = "20px auto";
          canvas.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
          canvas.style.background = "#fff";

          ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

          await page.render({
            canvasContext: ctx,
            viewport: scaledViewport,
          }).promise;

          if (cancelled) return;
          containerRef.current.appendChild(canvas);
        }
      } catch (error) {
        if (!cancelled) console.error("Error loading PDF:", error);
      } finally {
        clearTimeout(slowTimer);
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      // Aborts the in-flight fetch/render so leaving the page actually stops it.
      loadingTask?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const scroller = scrollRef.current;
    if (!wrapper || !scroller) return;

    const handleWheel = (e) => {
      const canvases = scroller.querySelectorAll("canvas");
      if (!canvases.length) return;

      let canvasLeft = Infinity;
      let canvasRight = -Infinity;

      canvases.forEach((canvas) => {
        const rect = canvas.getBoundingClientRect();
        canvasLeft = Math.min(canvasLeft, rect.left);
        canvasRight = Math.max(canvasRight, rect.right);
      });

      const mouseX = e.clientX;
      const isOverCanvas = mouseX >= canvasLeft && mouseX <= canvasRight;

      if (isOverCanvas) {
        // Scroll only the inner PDF scroller, not the page
        e.preventDefault();
        e.stopPropagation();
        scroller.scrollBy({ top: e.deltaY, behavior: "auto" });
        return;
      }

      // In the margin — scroll the left column
      e.preventDefault();
      e.stopPropagation();

      let parent = wrapper.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY;
        if (
          (overflowY === "auto" || overflowY === "scroll") &&
          parent.scrollHeight > parent.clientHeight
        ) {
          parent.scrollBy({ top: e.deltaY, behavior: "auto" });
          break;
        }
        parent = parent.parentElement;
      }
    };

    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <>
      <style>{`
        .pdf-scroller::-webkit-scrollbar {
          width: 6px;
        }
        .pdf-scroller::-webkit-scrollbar-track {
          background: transparent;
        }
        .pdf-scroller::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 999px;
        }
        .pdf-scroller::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.55);
        }
      `}</style>

      {/* Outer wrapper — full area, no scroll, catches wheel events */}
      <div
        ref={wrapperRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          alignItems: "stretch",
          position: "relative",
        }}
      >
        {isLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#000",
              zIndex: 10,
            }}
          >
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">
              {isSlow ? "PDF is too large, takes time to load..." : "Loading PDF..."}
            </p>
          </div>
        )}

        {/* Inner scroller — wraps only the canvas content, has the scrollbar */}
        <div
          ref={scrollRef}
          className="pdf-scroller"
          style={{
            margin: "0 auto",         
            width: "800px",           // matches your A4_WIDTH
            maxWidth: "100%",
            height: "100%",
            overflowY: "auto",
            overscrollBehavior: "contain",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.3) transparent",
          }}
        >
          <div ref={containerRef} />
        </div>
      </div>
    </>
  );
}