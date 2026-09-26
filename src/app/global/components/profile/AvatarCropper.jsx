import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { GreenBtn, GhostBtn } from "../ui/hw-ui";

const PREVIEW_SIZE = 280;
const OUTPUT_SIZE = 400;
const MAX_ZOOM = 3;

/**
 * Decode a picked file into a drawable source, honouring the EXIF orientation
 * phones write so portraits do not come out sideways.
 */
async function decodeFile(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Draw the crop window. Preview and export share this function so what the user
 * confirms is exactly what gets uploaded.
 */
function drawCrop(ctx, image, { size, zoom, offset }) {
  const base = size / Math.min(image.width, image.height);
  const scale = base * zoom;
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image.source, (size - w) / 2 + offset.x, (size - h) / 2 + offset.y, w, h);
}

/** Largest pan the image can take before the crop window would show empty space. */
function panLimit(image, { size, zoom }) {
  const base = size / Math.min(image.width, image.height);
  const scale = base * zoom;
  return {
    x: Math.max(0, (image.width * scale - size) / 2),
    y: Math.max(0, (image.height * scale - size) / 2),
  };
}

const AvatarCropper = ({ file, onCancel, onConfirm }) => {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef(null);

  useEffect(() => {
    let active = true;
    decodeFile(file)
      .then((decoded) => active && setImage(decoded))
      .catch(() => active && setImage(null));
    return () => {
      active = false;
    };
  }, [file]);

  // Repaint whenever the image or the crop changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PREVIEW_SIZE * dpr;
    canvas.height = PREVIEW_SIZE * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCrop(ctx, image, { size: PREVIEW_SIZE, zoom, offset });
  }, [image, zoom, offset]);

  // Keep the pan inside bounds when the zoom changes. Returning the previous
  // object when nothing moved lets React bail out instead of repainting.
  useEffect(() => {
    if (!image) return;
    const limit = panLimit(image, { size: PREVIEW_SIZE, zoom });
    setOffset((cur) => {
      const x = Math.min(limit.x, Math.max(-limit.x, cur.x));
      const y = Math.min(limit.y, Math.max(-limit.y, cur.y));
      return cur.x === x && cur.y === y ? cur : { x, y };
    });
  }, [image, zoom]);

  const handlePointerDown = (e) => {
    if (!image) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, from: offset };
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || !image) return;
    const limit = panLimit(image, { size: PREVIEW_SIZE, zoom });
    const x = drag.from.x + (e.clientX - drag.startX);
    const y = drag.from.y + (e.clientY - drag.startY);
    setOffset({
      x: Math.min(limit.x, Math.max(-limit.x, x)),
      y: Math.min(limit.y, Math.max(-limit.y, y)),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    if (!image || saving) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      drawCrop(canvas.getContext("2d"), image, { size: OUTPUT_SIZE, zoom, offset });
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Could not read the cropped image.");
      onConfirm(new File([blob], "avatar.png", { type: "image/png" }));
    } catch (err) {
      setSaving(false);
      throw err;
    }
  };

  const handleZoom = useCallback((e) => setZoom(Number(e.target.value)), []);

  if (!image) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_8px_32px_rgba(0,0,0,0.14)] px-8 py-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--hw-green-700)]" />
          <p className="text-[14px] text-[var(--hw-neutral-600)] mt-2">
            Preparing image…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_8px_32px_rgba(0,0,0,0.14)] p-6">
        <h3 className="text-[17px] font-bold text-black mb-1">Crop your photo</h3>
        <p className="text-[13px] text-[var(--hw-neutral-600)] mb-4">
          Drag to position the photo inside the circle, then confirm.
        </p>

        <div className="flex justify-center mb-5">
          <div
            className="relative touch-none select-none cursor-grab active:cursor-grabbing rounded-full"
            style={{
              width: PREVIEW_SIZE,
              height: PREVIEW_SIZE,
              // Tight 2px outer ring marking the crop edge.
              boxShadow: "0 0 0 2px rgba(255,255,255,0.9)",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: PREVIEW_SIZE,
                height: PREVIEW_SIZE,
                borderRadius: "50%",
              }}
            />
            {/* Darkens the four corners the round canvas leaves empty.
                The radial mask keeps that dimming inside this 280px box — a
                plain `box-shadow: 0 0 0 9999px` spread instead escapes the
                card and darkens the whole page. */}
            <span
              aria-hidden="true"
              data-testid="crop-guide"
              className="pointer-events-none absolute inset-0"
              style={{
                background: "rgba(0,0,0,0.5)",
                maskImage: `radial-gradient(circle at center, transparent 0 ${
                  PREVIEW_SIZE / 2
                }px, #000 ${PREVIEW_SIZE / 2}px)`,
              }}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 mb-6">
          <span className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
            Zoom
          </span>
          <input
            type="range"
            min="1"
            max={MAX_ZOOM}
            step="0.01"
            value={zoom}
            onChange={handleZoom}
            className="flex-1 accent-[var(--hw-green-700)]"
            aria-label="Zoom"
          />
        </label>

        <div className="flex gap-3">
          <GhostBtn onClick={onCancel} className="flex-1">
            Cancel
          </GhostBtn>
          <GreenBtn onClick={handleConfirm} disabled={saving} className="flex-1">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Confirm"
            )}
          </GreenBtn>
        </div>
      </div>
    </div>
  );
};

export { AvatarCropper };
