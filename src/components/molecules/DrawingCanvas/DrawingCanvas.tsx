import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { shapeToMaster, CANVAS_W, CANVAS_H, MAX_UNDO } from '../../../utils/shapeToMaster';
import type { Ellipse } from '../../../utils/puffs';

export interface DrawingCanvasHandle {
  undo: () => void;
  clear: () => void;
  initialize: (ellipses: Ellipse[]) => void;
}

interface DrawingCanvasProps {
  mode: 'brush' | 'eraser' | null;
  brushSize: number;
  onShapeChange: (master: Ellipse[]) => void;
  /** Ellipses to pre-draw on first mount (without triggering onShapeChange). */
  initialEllipses: Ellipse[];
}

interface CursorState {
  /** CSS px offset from canvas left edge */
  x: number;
  /** CSS px offset from canvas top edge */
  y: number;
  /** Brush radius in CSS px (accounts for canvas display scale) */
  r: number;
}

const DEBOUNCE_MS = 500;

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  ({ mode, brushSize, onShapeChange, initialEllipses }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDownRef = useRef(false);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const undoStackRef = useRef<string[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isDown, setIsDown] = useState(false);
    const [cursor, setCursor] = useState<CursorState | null>(null);

    function getCtx() {
      return canvasRef.current!.getContext('2d')!;
    }

    function drawEllipsesOnCtx(ctx: CanvasRenderingContext2D, ellipses: Ellipse[]) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,255,255,1)';
      for (const e of ellipses) {
        ctx.beginPath();
        ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Pre-draw the initial shape on mount. Parent already has the matching master
    // pre-computed, so we don't fire onShapeChange here.
    useEffect(() => {
      const ctx = getCtx();
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawEllipsesOnCtx(ctx, initialEllipses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    function updateCursor(clientX: number, clientY: number) {
      if (!mode) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      setCursor({
        x: clientX - rect.left,
        y: clientY - rect.top,
        r: brushSize * (rect.width / CANVAS_W),
      });
    }

    function paint(from: { x: number; y: number }, to: { x: number; y: number }) {
      const ctx = getCtx();
      ctx.save();
      ctx.globalCompositeOperation =
        mode === 'eraser' ? 'destination-out' : 'source-over';
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.strokeStyle = 'rgba(255,255,255,1)';
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
      updateCursor(clientX, clientY);
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
      setCursor(null);
      onPointerUp();
    }

    const cursorColor =
      mode === 'eraser' ? 'rgba(255,100,100,0.9)' : 'rgba(100,140,255,0.9)';

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
            // Visible at 15% when mode is active (guide), 40% while actively painting
            opacity: isDown ? 0.4 : mode ? 0.15 : 0,
            cursor: mode ? 'none' : 'default',
            pointerEvents: mode ? 'auto' : 'none',
            touchAction: 'none',
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
        {cursor && mode && (
          <div
            style={{
              position: 'absolute',
              left: cursor.x,
              top: cursor.y,
              width: cursor.r * 2,
              height: cursor.r * 2,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: `2px solid ${cursorColor}`,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
              pointerEvents: 'none',
            }}
          />
        )}
      </>
    );
  },
);

DrawingCanvas.displayName = 'DrawingCanvas';
