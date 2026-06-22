import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { shapeToMaster, CANVAS_W, CANVAS_H, MAX_UNDO } from '../../../utils/shapeToMaster';
import type { MasterShape } from '../../../utils/shapeToMaster';
import type { Ellipse } from '../../../utils/puffs';

export interface DrawingCanvasHandle {
  undo: () => void;
  clear: () => void;
  initialize: (ellipses: Ellipse[]) => void;
}

interface DrawingCanvasProps {
  mode: 'brush' | 'eraser' | null;
  brushSize: number;
  /** 0–1. Active-stroke opacity; hovering shows this × 0.375. */
  overlayOpacity: number;
  /** Colour used for brush strokes (should match the cloud colour). */
  brushColor: string;
  onShapeChange: (master: MasterShape) => void;
  initialEllipses: Ellipse[];
}

const DEBOUNCE_MS = 500;

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  ({ mode, brushSize, overlayOpacity, brushColor, onShapeChange, initialEllipses }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const isDownRef = useRef(false);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const undoStackRef = useRef<string[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Only isDown drives React state (changes twice per stroke, not per move).
    const [isDown, setIsDown] = useState(false);

    function getCtx() {
      return canvasRef.current!.getContext('2d')!;
    }

    function drawEllipsesOnCtx(ctx: CanvasRenderingContext2D, ellipses: Ellipse[]) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = brushColor;
      for (const e of ellipses) {
        ctx.beginPath();
        ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Pre-draw initial shape on mount — parent already has the matching master.
    useEffect(() => {
      const ctx = getCtx();
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawEllipsesOnCtx(ctx, initialEllipses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep cursor ring colour in sync with mode/brushColor without mouse moves.
    useEffect(() => {
      const el = cursorRef.current;
      if (!el) return;
      if (!mode) {
        el.style.display = 'none';
        return;
      }
      el.style.borderColor =
        mode === 'eraser' ? 'rgba(255,100,100,0.9)' : brushColor;
    }, [mode, brushColor]);

    // Resize cursor ring when brushSize changes while hovering.
    useEffect(() => {
      const el = cursorRef.current;
      const canvas = canvasRef.current;
      if (!el || !canvas || el.style.display === 'none') return;
      const scale = canvas.getBoundingClientRect().width / CANVAS_W;
      const r = brushSize * scale;
      el.style.width = `${r * 2}px`;
      el.style.height = `${r * 2}px`;
    }, [brushSize]);

    function fireShapeChange() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const imageData = getCtx().getImageData(0, 0, CANVAS_W, CANVAS_H);
      onShapeChange(shapeToMaster(imageData));
    }

    function scheduleShapeChange() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(fireShapeChange, DEBOUNCE_MS);
    }

    function flushShapeChange() {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      fireShapeChange();
    }

    function saveSnapshot() {
      const dataUrl = canvasRef.current!.toDataURL('image/png');
      const stack = undoStackRef.current;
      stack.push(dataUrl);
      if (stack.length > MAX_UNDO) stack.shift();
    }

    function restoreFromUrl(dataUrl: string) {
      const ctx = getCtx();
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.drawImage(img, 0, 0);
        flushShapeChange();
      };
      img.src = dataUrl;
    }

    useImperativeHandle(ref, () => ({
      undo() {
        const stack = undoStackRef.current;
        if (stack.length === 0) return;
        restoreFromUrl(stack.pop()!);
      },
      clear() {
        saveSnapshot();
        getCtx().clearRect(0, 0, CANVAS_W, CANVAS_H);
        flushShapeChange();
      },
      initialize(ellipses: Ellipse[]) {
        undoStackRef.current = [];
        const ctx = getCtx();
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        drawEllipsesOnCtx(ctx, ellipses);
        flushShapeChange();
      },
    }));

    function getCanvasCoords(clientX: number, clientY: number) {
      const rect = canvasRef.current!.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * CANVAS_W,
        y: ((clientY - rect.top) / rect.height) * CANVAS_H,
      };
    }

    // Update cursor ring via direct DOM ref — avoids React re-renders on every move.
    function moveCursor(clientX: number, clientY: number) {
      const el = cursorRef.current;
      const canvas = canvasRef.current;
      if (!el || !canvas || !mode) return;
      const rect = canvas.getBoundingClientRect();
      const r = brushSize * (rect.width / CANVAS_W);
      el.style.display = 'block';
      el.style.left = `${clientX - rect.left}px`;
      el.style.top = `${clientY - rect.top}px`;
      el.style.width = `${r * 2}px`;
      el.style.height = `${r * 2}px`;
    }

    function hideCursor() {
      const el = cursorRef.current;
      if (el) el.style.display = 'none';
    }

    function paint(from: { x: number; y: number }, to: { x: number; y: number }) {
      const ctx = getCtx();
      ctx.save();
      ctx.globalCompositeOperation =
        mode === 'eraser' ? 'destination-out' : 'source-over';
      ctx.fillStyle = brushColor;
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(to.x, to.y, brushSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function onPointerDown(clientX: number, clientY: number) {
      if (!mode) return;
      saveSnapshot();
      isDownRef.current = true;
      setIsDown(true);
      const pos = getCanvasCoords(clientX, clientY);
      lastPosRef.current = pos;
      paint(pos, pos);
      scheduleShapeChange();
    }

    function onPointerMove(clientX: number, clientY: number) {
      moveCursor(clientX, clientY);
      if (!isDownRef.current || !mode) return;
      const pos = getCanvasCoords(clientX, clientY);
      paint(lastPosRef.current!, pos);
      lastPosRef.current = pos;
      scheduleShapeChange();
    }

    function onPointerUp() {
      if (!isDownRef.current) return;
      isDownRef.current = false;
      setIsDown(false);
      lastPosRef.current = null;
      flushShapeChange();
    }

    function handleMouseLeave() {
      hideCursor();
      onPointerUp();
    }

    return (
      <>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: isDown ? overlayOpacity : mode ? overlayOpacity * 0.375 : 0,
            cursor: mode ? 'none' : 'default',
            pointerEvents: mode ? 'auto' : 'none',
            touchAction: 'none',
            // Own GPU layer so canvas repaints don't invalidate the SVG filter cache.
            willChange: 'contents',
          }}
          onMouseDown={(e) => { e.preventDefault(); onPointerDown(e.clientX, e.clientY); }}
          onMouseMove={(e) => onPointerMove(e.clientX, e.clientY)}
          onMouseUp={onPointerUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={(e) => { e.preventDefault(); const t = e.touches[0]; onPointerDown(t.clientX, t.clientY); }}
          onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; onPointerMove(t.clientX, t.clientY); }}
          onTouchEnd={(e) => { e.preventDefault(); onPointerUp(); }}
          onTouchCancel={(e) => { e.preventDefault(); onPointerUp(); }}
        />
        {/* Cursor ring — always mounted, positioned/shown via ref to avoid re-renders. */}
        <div
          ref={cursorRef}
          style={{
            display: 'none',
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: `2px solid ${mode === 'eraser' ? 'rgba(255,100,100,0.9)' : brushColor}`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.3)',
            pointerEvents: 'none',
          }}
        />
      </>
    );
  },
);

DrawingCanvas.displayName = 'DrawingCanvas';
