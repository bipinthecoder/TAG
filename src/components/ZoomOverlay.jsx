import { useState, useRef, useEffect } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

export default function ZoomOverlay({ url, filename, onClose }) {
  // Single transform state: scale + translation from container centre
  const [tr, setTr] = useState({ scale: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // Refs so wheel handler always sees current values without re-attaching
  const trRef = useRef({ scale: 1, x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const commit = (next) => { trRef.current = next; setTr(next); };
  const reset = () => commit({ scale: 1, x: 0, y: 0 });

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Non-passive wheel handler so preventDefault works (React makes wheel passive by default)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const { scale, x, y } = trRef.current;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const ns = Math.min(Math.max(scale * factor, 0.25), 20);
      const rect = el.getBoundingClientRect();
      // Mouse position relative to container centre
      const mx = e.clientX - (rect.left + rect.width / 2);
      const my = e.clientY - (rect.top + rect.height / 2);
      // Zoom towards cursor: keep the point under the cursor stationary
      commit({ scale: ns, x: mx - (mx - x) * factor, y: my - (my - y) * factor });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;
    setDragging(true);
    dragStart.current = { x: e.clientX - trRef.current.x, y: e.clientY - trRef.current.y };
  };

  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    const next = { ...trRef.current, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
    trRef.current = next;
    setTr(next);
  };

  const onMouseUp = () => { isDragging.current = false; setDragging(false); };

  return (
    <Stack
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.93)", zIndex: 1400, userSelect: "none" }}
    >
      {/* Top bar */}
      <Stack
        direction="row"
        alignItems="center"
        gap={1.5}
        sx={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 1,
          px: 2, py: 1.5,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
        }}
      >
        <Typography variant="caption"
          sx={{ flex: 1, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>
          {filename}
        </Typography>
        <Typography variant="caption" onClick={reset}
          sx={{ color: "rgba(255,255,255,0.35)", cursor: "pointer", "&:hover": { color: "#fff" } }}>
          Reset
        </Typography>
        <IconButton size="small" onClick={onClose}
          sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)", "&:hover": { bgcolor: "rgba(255,255,255,0.22)" } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Image — fills the overlay, user zooms in beyond that */}
      <Stack
        onMouseDown={onMouseDown}
        sx={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center",
          cursor: dragging ? "grabbing" : "grab", overflow: "hidden" }}
      >
        <img
          src={url}
          alt={filename}
          draggable={false}
          onDoubleClick={reset}
          style={{
            width: "95vw",
            height: "95vh",
            objectFit: "contain",
            transform: `translate(${tr.x}px, ${tr.y}px) scale(${tr.scale})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.06s ease-out",
            pointerEvents: "none",
          }}
        />
      </Stack>

      {/* Hint */}
      <Typography variant="caption" sx={{
        position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center",
        color: "rgba(255,255,255,0.18)", pointerEvents: "none",
      }}>
        scroll to zoom · drag to pan · double-click to reset
      </Typography>
    </Stack>
  );
}
