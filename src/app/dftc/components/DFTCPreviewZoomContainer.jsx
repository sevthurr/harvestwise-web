import React, { useState, useEffect, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";

const ZOOM_PRESETS = [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1.0, 1.25, 1.5, 1.75, 2.0];

/**
 * Reusable container for document/sheet previews with responsive default zoom-out
 * and interactive zoom in/out controls.
 *
 * Automatically fits the document width on mobile so tables/pages (typically ~660-750px wide)
 * are not cut off horizontally on initial load. Users can zoom in via buttons, double-tap,
 * or pinch gestures to inspect details up close, and pan smoothly.
 */
export function DFTCPreviewZoomContainer({
  children,
  label = "",
  minZoom = 0.35,
  maxZoom = 2.0,
  className = "",
  contentClassName = "",
  showToolbar = true,
  maxHeight = "72vh"
}) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const lastTapRef = useRef(0);
  const touchDistRef = useRef(null);
  const touchScaleStartRef = useRef(1);

  // Default to "Fit" on screens narrower than typical desktop (768px)
  const [isFit, setIsFit] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return true;
  });

  const [scale, setScale] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      return 0.55;
    }
    return 1;
  });

  const [fitScale, setFitScale] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      return 0.55;
    }
    return 1;
  });

  const [dimensions, setDimensions] = useState({ contentWidth: 0, contentHeight: 0 });

  // Compute fit scale based on viewport client width vs untransformed content width
  const updateFitScale = useCallback(() => {
    if (!contentRef.current || !viewportRef.current) return;
    const cw = contentRef.current.scrollWidth || contentRef.current.offsetWidth || 720;
    const ch = contentRef.current.scrollHeight || contentRef.current.offsetHeight || 800;
    const vw = viewportRef.current.clientWidth || (typeof window !== "undefined" ? window.innerWidth - 32 : 360);

    if (cw > 0 && ch > 0) {
      setDimensions({ contentWidth: cw, contentHeight: ch });
      // Fit calculation: leave 12px breathing room for borders/margins
      const availableWidth = Math.max(vw - 12, 100);
      const computedFit = Math.min(1, Math.max(minZoom, Math.round((availableWidth / cw) * 100) / 100));
      setFitScale(computedFit);

      if (isFit) {
        setScale(computedFit);
      }
    }
  }, [minZoom, isFit]);

  useEffect(() => {
    updateFitScale();
    const handleResize = () => {
      updateFitScale();
    };
    window.addEventListener("resize", handleResize);

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateFitScale();
      });
      if (contentRef.current) observer.observe(contentRef.current);
      if (viewportRef.current) observer.observe(viewportRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (observer) observer.disconnect();
    };
  }, [updateFitScale]);

  // Step zoom in/out to next preset or increment
  const handleZoomIn = () => {
    setIsFit(false);
    setScale((prev) => {
      const nextPreset = ZOOM_PRESETS.find((p) => p > prev + 0.04);
      const target = nextPreset !== undefined ? nextPreset : prev + 0.15;
      return Math.min(maxZoom, Math.round(target * 100) / 100);
    });
  };

  const handleZoomOut = () => {
    setIsFit(false);
    setScale((prev) => {
      const reversed = [...ZOOM_PRESETS].reverse();
      const prevPreset = reversed.find((p) => p < prev - 0.04);
      const target = prevPreset !== undefined ? prevPreset : prev - 0.15;
      return Math.max(minZoom, Math.round(target * 100) / 100);
    });
  };

  const handleToggleFit = () => {
    if (isFit) {
      setIsFit(false);
      setScale(1);
    } else {
      setIsFit(true);
      setScale(fitScale);
    }
  };

  const handleReset = () => {
    setIsFit(false);
    setScale(1);
  };

  // Double tap to toggle Fit <-> 100%
  const handleDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      handleToggleFit();
    }
    lastTapRef.current = now;
  };

  // Pinch-to-zoom on touch devices
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistRef.current = dist;
      touchScaleStartRef.current = scale;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchDistRef.current;
      const newScale = Math.min(maxZoom, Math.max(minZoom, touchScaleStartRef.current * ratio));
      setIsFit(false);
      setScale(Math.round(newScale * 100) / 100);
    }
  };

  const handleTouchEnd = () => {
    touchDistRef.current = null;
  };

  // Ctrl + Wheel to zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setIsFit(false);
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setScale((prev) => Math.min(maxZoom, Math.max(minZoom, Math.round((prev + delta) * 100) / 100)));
    }
  };

  const scaledWidth = dimensions.contentWidth > 0 ? dimensions.contentWidth * scale : null;
  const scaledHeight = dimensions.contentHeight > 0 ? dimensions.contentHeight * scale : null;

  return (
    <div className={`relative rounded-xl border border-[var(--hw-neutral-300)] bg-white shadow-sm flex flex-col overflow-hidden ${className}`}>
      {/* Zoom Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)] text-[11px] sm:text-[12px] text-[var(--hw-neutral-700)] select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-[var(--hw-neutral-800)] truncate">
              {label || "Preview"}
            </span>
            {isFit && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--hw-green-100)] text-[var(--hw-green-800)] border border-[var(--hw-green-300)] shrink-0">
                Fit to screen
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Zoom Out Button */}
            <button
              type="button"
              data-testid="zoom-out-btn"
              onClick={handleZoomOut}
              disabled={scale <= minZoom}
              className="p-1 rounded-lg border border-[var(--hw-neutral-200)] bg-white hover:bg-[var(--hw-neutral-100)] active:bg-[var(--hw-neutral-200)] disabled:opacity-40 transition-colors cursor-pointer"
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5 text-[var(--hw-neutral-700)]" />
            </button>

            {/* Percentage Badge / Click to toggle Fit */}
            <button
              type="button"
              data-testid="zoom-percent-btn"
              onClick={handleToggleFit}
              className="px-2 py-0.5 rounded-lg border border-[var(--hw-neutral-200)] bg-white hover:bg-[var(--hw-neutral-100)] font-semibold text-[11px] min-w-[48px] text-center text-[var(--hw-neutral-800)] transition-colors cursor-pointer"
              title={isFit ? "Click for 100% actual size" : "Click to Fit to screen"}
            >
              {Math.round(scale * 100)}%
            </button>

            {/* Zoom In Button */}
            <button
              type="button"
              data-testid="zoom-in-btn"
              onClick={handleZoomIn}
              disabled={scale >= maxZoom}
              className="p-1 rounded-lg border border-[var(--hw-neutral-200)] bg-white hover:bg-[var(--hw-neutral-100)] active:bg-[var(--hw-neutral-200)] disabled:opacity-40 transition-colors cursor-pointer"
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5 text-[var(--hw-neutral-700)]" />
            </button>

            {/* Fit Button */}
            <button
              type="button"
              onClick={handleToggleFit}
              className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-colors hidden xs:inline-flex items-center gap-1 cursor-pointer ${
                isFit
                  ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]"
                  : "border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)]"
              }`}
              title="Fit document to screen width"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit</span>
            </button>

            {/* 100% Button */}
            <button
              type="button"
              onClick={handleReset}
              className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-colors hidden sm:inline-flex items-center gap-1 cursor-pointer ${
                !isFit && Math.round(scale * 100) === 100
                  ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]"
                  : "border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)]"
              }`}
              title="Actual 100% size"
            >
              <span>100%</span>
            </button>

            {/* Reset Button (only shown if not 100% and not fit) */}
            {!isFit && Math.round(scale * 100) !== 100 && (
              <button
                type="button"
                onClick={handleReset}
                className="p-1 rounded-lg border border-[var(--hw-neutral-200)] bg-white hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors cursor-pointer"
                title="Reset to 100%"
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Viewport */}
      <div
        ref={viewportRef}
        className="relative overflow-auto p-1 sm:p-2 bg-[var(--hw-neutral-50)]/40 [scrollbar-width:thin] touch-pan-x touch-pan-y"
        style={{
          maxHeight,
          WebkitOverflowScrolling: "touch"
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={handleDoubleTap}
      >
        {/* Sizer div that matches the scaled footprint */}
        <div
          style={{
            width: scaledWidth ? `${scaledWidth}px` : "auto",
            height: scaledHeight ? `${scaledHeight}px` : "auto",
            overflow: "hidden",
            margin: "0 auto",
            position: "relative"
          }}
        >
          {/* Transformed content container */}
          <div
            ref={contentRef}
            className={contentClassName}
            style={{
              width: dimensions.contentWidth ? `${dimensions.contentWidth}px` : "max-content",
              transform: `scale(${scale})`,
              transformOrigin: "top left"
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DFTCPreviewZoomContainer;
