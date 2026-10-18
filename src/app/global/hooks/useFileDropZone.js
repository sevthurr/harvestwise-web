import { useCallback, useRef, useState } from "react";

// A drag is only a file drag when the browser says so. Folders and other
// non-file drags come through as items with kind "string", and must be ignored
// rather than handed to the parser as a bogus File.
function hasFileEntry(dataTransfer) {
  if (!dataTransfer) return false;
  const items = dataTransfer.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i += 1) {
      if (items[i] && items[i].kind === "file") return true;
    }
    return false;
  }
  const types = dataTransfer.types;
  if (types && types.length > 0) {
    return Array.prototype.indexOf.call(types, "Files") !== -1;
  }
  return true;
}

/**
 * Drag-and-drop wiring for a file drop zone.
 *
 * Returns `{ dropProps, isDragging }`: spread `dropProps` on the drop target
 * and use `isDragging` to style the armed state. Click and keyboard activation
 * are untouched — the caller keeps its own `<input type="file">`.
 */
export function useFileDropZone({ onFile, disabled = false } = {}) {
  const [isDragging, setIsDragging] = useState(false);
  // dragenter/dragleave also fire when the pointer crosses child elements, so a
  // counter keeps the highlight steady instead of flickering off mid-drag.
  const dragDepthRef = useRef(0);

  const handleDragEnter = useCallback(
    (e) => {
      if (disabled || !hasFileEntry(e.dataTransfer)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setIsDragging(true);
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (e) => {
      if (disabled) return;
      // Without preventDefault the browser refuses the drop outright.
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      if (hasFileEntry(e.dataTransfer)) {
        dragDepthRef.current = Math.max(dragDepthRef.current, 1);
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    setIsDragging(dragDepthRef.current > 0);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      if (disabled || !hasFileEntry(e.dataTransfer)) return;
      const dropped = e.dataTransfer?.files?.[0];
      if (dropped && onFile) onFile(dropped);
    },
    [disabled, onFile]
  );

  return {
    isDragging,
    dropProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}