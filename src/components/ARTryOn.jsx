import { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, CameraOff, Loader2, RotateCcw, Download, ScanLine, Wand2 } from "lucide-react";
import { motion } from "framer-motion";

// Load MediaPipe scripts dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const MEDIAPIPE_POSE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js";
const MEDIAPIPE_CAM_UTILS = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js";
const MEDIAPIPE_DRAWING = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js";

// Foot landmark indices in MediaPipe Pose
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;
const LEFT_HEEL = 29;
const RIGHT_HEEL = 30;
const LEFT_FOOT_INDEX = 31;
const RIGHT_FOOT_INDEX = 32;

export default function ARTryOn({ shoe, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const shoeImgRef = useRef(null);
  const streamRef = useRef(null);
  const poseRef = useRef(null);
  const cameraUtilRef = useRef(null);
  const animFrameRef = useRef(null);
  const manualPosRef = useRef({ x: 50, y: 75 });
  const manualScaleRef = useRef(1);

  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState(null);
  const [autoDetect, setAutoDetect] = useState(true);
  const [poseReady, setPoseReady] = useState(false);
  const [footsDetected, setFootsDetected] = useState(false);
  const [manualScale, setManualScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [manualPos, setManualPos] = useState({ x: 50, y: 75 });
  const [shoeRemoveBg, setShoeRemoveBg] = useState(null); // processed shoe image

  // Preprocess shoe image: remove white/light background using canvas
  useEffect(() => {
    if (!shoe?.image_url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, c.width, c.height);
      const data = imageData.data;

      // Sample background color from corners (assumed to be background)
      const sampleCorners = (d, w, h) => {
        const positions = [
          0, // top-left
          (w - 1) * 4, // top-right
          (h - 1) * w * 4, // bottom-left
          ((h - 1) * w + w - 1) * 4, // bottom-right
          (Math.floor(h / 2) * w) * 4, // mid-left
          (Math.floor(h / 2) * w + w - 1) * 4, // mid-right
        ];
        return positions.map(p => ({ r: d[p], g: d[p + 1], b: d[p + 2] }));
      };

      const corners = sampleCorners(data, c.width, c.height);
      const avgBg = corners.reduce((acc, px) => ({
        r: acc.r + px.r / corners.length,
        g: acc.g + px.g / corners.length,
        b: acc.b + px.b / corners.length,
      }), { r: 0, g: 0, b: 0 });

      const tolerance = 30;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const dr = Math.abs(r - avgBg.r);
        const dg = Math.abs(g - avgBg.g);
        const db = Math.abs(b - avgBg.b);
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        if (dist < tolerance) {
          data[i + 3] = 0; // remove background pixel
        } else if (dist < tolerance + 15) {
          // soft edge feathering
          data[i + 3] = Math.round(((dist - tolerance) / 15) * 255);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setShoeRemoveBg(c.toDataURL("image/png"));

      // Also store as Image for canvas drawing
      const processed = new Image();
      processed.onload = () => { shoeImgRef.current = processed; };
      processed.src = c.toDataURL("image/png");
    };
    img.onerror = () => {
      // fallback: use original
      const fallback = new Image();
      fallback.crossOrigin = "anonymous";
      fallback.onload = () => { shoeImgRef.current = fallback; };
      fallback.src = shoe.image_url;
    };
    img.src = shoe.image_url;
  }, [shoe?.image_url]);

  // Sync manual pos/scale to refs for use in canvas loop
  useEffect(() => { manualPosRef.current = manualPos; }, [manualPos]);
  useEffect(() => { manualScaleRef.current = manualScale; }, [manualScale]);

  const drawShoeOnCanvas = useCallback((ctx, canvasW, canvasH, landmarks) => {
    if (!shoeImgRef.current) return;

    let leftShoe = null;
    let rightShoe = null;

    if (autoDetect && landmarks) {
      const lAnkle = landmarks[LEFT_ANKLE];
      const lHeel = landmarks[LEFT_HEEL];
      const lToe = landmarks[LEFT_FOOT_INDEX];
      const rAnkle = landmarks[RIGHT_ANKLE];
      const rHeel = landmarks[RIGHT_HEEL];
      const rToe = landmarks[RIGHT_FOOT_INDEX];

      // Only draw if visibility is decent
      if (lAnkle?.visibility > 0.4 && lToe?.visibility > 0.4) {
        const lx = ((lHeel?.x + lToe?.x) / 2) * canvasW;
        const ly = ((lHeel?.y + lToe?.y) / 2) * canvasH;
        const footLen = Math.hypot((lToe.x - lHeel.x) * canvasW, (lToe.y - lHeel.y) * canvasH);
        const angle = Math.atan2((lToe.y - lHeel.y) * canvasH, (lToe.x - lHeel.x) * canvasW);
        leftShoe = { cx: lx, cy: ly, len: footLen, angle };
      }
      if (rAnkle?.visibility > 0.4 && rToe?.visibility > 0.4) {
        const rx = ((rHeel?.x + rToe?.x) / 2) * canvasW;
        const ry = ((rHeel?.y + rToe?.y) / 2) * canvasH;
        const footLen = Math.hypot((rToe.x - rHeel.x) * canvasW, (rToe.y - rHeel.y) * canvasH);
        const angle = Math.atan2((rToe.y - rHeel.y) * canvasH, (rToe.x - rHeel.x) * canvasW);
        rightShoe = { cx: rx, cy: ry, len: footLen, angle };
      }
      setFootsDetected(!!(leftShoe || rightShoe));
    }

    const drawShoe = (cx, cy, w, h, angle, flipH) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      if (flipH) ctx.scale(-1, 1);
      ctx.globalAlpha = 0.95;
      ctx.drawImage(shoeImgRef.current, -w / 2, -h / 2, w, h);
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    if (leftShoe || rightShoe) {
      // Auto-detect mode: draw on detected feet
      if (leftShoe) {
        const w = leftShoe.len * 2.2 * manualScaleRef.current;
        const h = w * 0.5;
        drawShoe(leftShoe.cx, leftShoe.cy, w, h, leftShoe.angle, false);
      }
      if (rightShoe) {
        const w = rightShoe.len * 2.2 * manualScaleRef.current;
        const h = w * 0.5;
        drawShoe(rightShoe.cx, rightShoe.cy, w, h, rightShoe.angle, true);
      }
    } else {
      // Manual mode or no detection — draw at manual position
      const cx = (manualPosRef.current.x / 100) * canvasW;
      const cy = (manualPosRef.current.y / 100) * canvasH;
      const w = canvasW * 0.32 * manualScaleRef.current;
      const h = w * 0.5;
      drawShoe(cx, cy, w, h, 0, false);
    }
  }, [autoDetect]);

  const startAR = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Start camera
      setLoadingMsg("Starting camera…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      // Load MediaPipe scripts
      setLoadingMsg("Loading AI foot detection…");
      await Promise.all([
        loadScript(MEDIAPIPE_POSE_CDN),
        loadScript(MEDIAPIPE_CAM_UTILS),
        loadScript(MEDIAPIPE_DRAWING),
      ]);

      // Init MediaPipe Pose
      setLoadingMsg("Initializing pose model…");
      const Pose = window.Pose;
      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      pose.onResults((results) => {
        const vw = video.videoWidth || canvas.width;
        const vh = video.videoHeight || canvas.height;
        canvas.width = vw;
        canvas.height = vh;

        // Draw video frame (mirrored for front-facing feel)
        ctx.save();
        ctx.clearRect(0, 0, vw, vh);
        ctx.drawImage(results.image, 0, 0, vw, vh);
        ctx.restore();

        // Draw shoe overlay
        drawShoeOnCanvas(ctx, vw, vh, results.poseLandmarks);
      });

      poseRef.current = pose;

      // Use MediaPipe Camera util to feed frames
      const Camera = window.Camera;
      const cam = new Camera(video, {
        onFrame: async () => {
          if (poseRef.current) await poseRef.current.send({ image: video });
        },
        width: 1280,
        height: 720,
      });
      await cam.start();
      cameraUtilRef.current = cam;

      setPoseReady(true);
      setCameraActive(true);
    } catch (e) {
      console.error(e);
      if (e.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera permissions and try again.");
      } else {
        setError("Failed to start AR. " + (e.message || "Please try again."));
      }
    }

    setLoading(false);
    setLoadingMsg("");
  }, [drawShoeOnCanvas]);

  const stopAR = useCallback(() => {
    cameraUtilRef.current?.stop?.();
    cameraUtilRef.current = null;
    poseRef.current?.close?.();
    poseRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setCameraActive(false);
    setPoseReady(false);
    setFootsDetected(false);
  }, []);

  useEffect(() => () => stopAR(), []);

  const savePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${shoe.name}-ar-tryon.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/jpeg", 0.9);
  };

  // Dragging for manual mode
  const handlePointerDown = (e) => {
    if (footsDetected && autoDetect) return;
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, ox: manualPos.x, oy: manualPos.y });
  };
  const handlePointerMove = (e) => {
    if (!dragging || !dragStart) return;
    const container = canvasRef.current?.parentElement?.getBoundingClientRect();
    if (!container) return;
    const dx = ((e.clientX - dragStart.x) / container.width) * 100;
    const dy = ((e.clientY - dragStart.y) / container.height) * 100;
    setManualPos({
      x: Math.max(5, Math.min(95, dragStart.ox + dx)),
      y: Math.max(5, Math.min(95, dragStart.oy + dy)),
    });
  };
  const handlePointerUp = () => setDragging(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-heading font-bold text-base flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" /> AR Try-On
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">AI</span>
            </h2>
            <p className="text-xs text-muted-foreground">{shoe.brand} {shoe.name}</p>
          </div>
          <button onClick={() => { stopAR(); onClose(); }} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera/Canvas viewport */}
        <div
          className="relative bg-black overflow-hidden flex-shrink-0"
          style={{ aspectRatio: "16/9" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Hidden video feed */}
          <video ref={videoRef} className="hidden" muted playsInline />

          {/* Main canvas where everything is composited */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover"
            style={{ cursor: cameraActive && !footsDetected ? (dragging ? "grabbing" : "grab") : "default" }}
            onPointerDown={handlePointerDown}
          />

          {/* Status badges */}
          {cameraActive && (
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {footsDetected && autoDetect ? (
                <div className="flex items-center gap-1.5 bg-green-500/90 text-white text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Foot detected
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-black/50 text-white/80 text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {autoDetect ? "Scanning for feet…" : "Manual mode"}
                </div>
              )}
            </div>
          )}

          {/* Auto/Manual toggle */}
          {cameraActive && (
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setAutoDetect(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur-sm transition-all ${
                  autoDetect ? "bg-primary/90 text-white" : "bg-black/50 text-white/80"
                }`}
              >
                <Wand2 className="w-3 h-3" />
                {autoDetect ? "Auto" : "Manual"}
              </button>
            </div>
          )}

          {/* Prompt overlay when camera not active */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              {loading ? (
                <>
                  <div className="relative">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{loadingMsg || "Loading…"}</p>
                    <p className="text-xs text-white/50 mt-1">This may take a moment</p>
                  </div>
                </>
              ) : error ? (
                <div className="text-center px-6">
                  <p className="text-4xl mb-3">⚠️</p>
                  <p className="text-sm text-red-400 leading-relaxed">{error}</p>
                </div>
              ) : (
                <div className="text-center px-6">
                  <div className="text-5xl mb-3">👟</div>
                  <p className="text-sm text-white/80 leading-relaxed max-w-xs">
                    Point your camera at your feet — AI will automatically detect and fit the shoe on you
                  </p>
                  {shoeRemoveBg && (
                    <div className="mt-4 flex justify-center">
                      <img src={shoeRemoveBg} alt="preview" className="h-16 drop-shadow-2xl" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-3 flex-shrink-0">
          {/* Size slider */}
          {cameraActive && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-8">Size</span>
              <input
                type="range" min={0.4} max={3} step={0.05}
                value={manualScale}
                onChange={e => setManualScale(parseFloat(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(manualScale * 100)}%</span>
            </div>
          )}

          <div className="flex gap-2.5">
            {!cameraActive ? (
              <button
                onClick={startAR}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {loading ? loadingMsg || "Loading…" : "Start AR Try-On"}
              </button>
            ) : (
              <>
                <button
                  onClick={stopAR}
                  className="flex items-center justify-center gap-2 bg-secondary text-foreground px-4 py-3 rounded-2xl font-medium hover:bg-secondary/80 transition-colors"
                  title="Stop camera"
                >
                  <CameraOff className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setManualPos({ x: 50, y: 75 }); setManualScale(1); }}
                  className="flex items-center justify-center gap-2 bg-secondary text-foreground px-4 py-3 rounded-2xl font-medium hover:bg-secondary/80 transition-colors"
                  title="Reset position"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={savePhoto}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity text-sm"
                >
                  <Download className="w-4 h-4" />
                  Save Photo
                </button>
              </>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            {cameraActive
              ? footsDetected && autoDetect
                ? "✓ Auto-fitting shoe to your feet · Use size slider to adjust"
                : autoDetect
                  ? "Point camera at your feet for auto-detection · Or switch to Manual"
                  : "Drag the shoe to position it · Use size slider to adjust"
              : "AI-powered foot detection with background removal"}
          </p>
        </div>
      </motion.div>
    </div>
  );
}