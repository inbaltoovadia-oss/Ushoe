import { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, CameraOff, Loader2, RotateCcw, Download, ScanLine, Wand2, FlipHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { motion } from "framer-motion";

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

const LEFT_HEEL = 29;
const RIGHT_HEEL = 30;
const LEFT_FOOT_INDEX = 31;
const RIGHT_FOOT_INDEX = 32;

// Smooth landmark positions using exponential moving average
function smoothLandmark(prev, next, alpha = 0.35) {
  if (!prev) return next;
  return {
    x: prev.x * (1 - alpha) + next.x * alpha,
    y: prev.y * (1 - alpha) + next.y * alpha,
    visibility: next.visibility,
  };
}

export default function ARTryOn({ shoe, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const shoeImgRef = useRef(null);
  const streamRef = useRef(null);
  const poseRef = useRef(null);
  const cameraUtilRef = useRef(null);
  const smoothedLandmarksRef = useRef(null);
  const manualPosRef = useRef({ x: 50, y: 75 });
  const manualScaleRef = useRef(1);
  const facingModeRef = useRef("environment");
  const autoDetectRef = useRef(true);
  const footsDetectedRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState(null);
  const [autoDetect, setAutoDetect] = useState(true);
  const [footsDetected, setFootsDetected] = useState(false);
  const [manualScale, setManualScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [manualPos, setManualPos] = useState({ x: 50, y: 75 });
  const [shoePreview, setShoePreview] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" | "user"
  const [switching, setSwitching] = useState(false);

  // Keep refs in sync
  useEffect(() => { manualPosRef.current = manualPos; }, [manualPos]);
  useEffect(() => { manualScaleRef.current = manualScale; }, [manualScale]);
  useEffect(() => { autoDetectRef.current = autoDetect; }, [autoDetect]);

  // Preprocess shoe image — corner-based background removal
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
      const W = c.width, H = c.height;

      // Sample corners + edges to determine background color
      const samplePx = (idx) => ({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      const samples = [
        samplePx(0),
        samplePx((W - 1) * 4),
        samplePx((H - 1) * W * 4),
        samplePx(((H - 1) * W + W - 1) * 4),
        samplePx(Math.floor(W / 2) * 4), // top center
        samplePx(((H - 1) * W + Math.floor(W / 2)) * 4), // bottom center
      ];
      const avgBg = samples.reduce((a, p) => ({ r: a.r + p.r / samples.length, g: a.g + p.g / samples.length, b: a.b + p.b / samples.length }), { r: 0, g: 0, b: 0 });

      const HARD = 28;
      const SOFT = 18;

      for (let i = 0; i < data.length; i += 4) {
        const dist = Math.sqrt(
          Math.pow(data[i] - avgBg.r, 2) +
          Math.pow(data[i + 1] - avgBg.g, 2) +
          Math.pow(data[i + 2] - avgBg.b, 2)
        );
        if (dist < HARD) {
          data[i + 3] = 0;
        } else if (dist < HARD + SOFT) {
          data[i + 3] = Math.round(((dist - HARD) / SOFT) * 255);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      const dataUrl = c.toDataURL("image/png");
      setShoePreview(dataUrl);
      const processed = new Image();
      processed.onload = () => { shoeImgRef.current = processed; };
      processed.src = dataUrl;
    };
    img.onerror = () => {
      const fallback = new Image();
      fallback.crossOrigin = "anonymous";
      fallback.onload = () => { shoeImgRef.current = fallback; };
      fallback.src = shoe.image_url;
      setShoePreview(shoe.image_url);
    };
    img.src = shoe.image_url;
  }, [shoe?.image_url]);

  const drawFrame = useCallback((results, isFrontCam) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const vw = results.image.width || canvas.width;
    const vh = results.image.height || canvas.height;
    canvas.width = vw;
    canvas.height = vh;

    ctx.clearRect(0, 0, vw, vh);

    // Mirror front camera
    if (isFrontCam) {
      ctx.save();
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, vw, vh);
      ctx.restore();
    } else {
      ctx.drawImage(results.image, 0, 0, vw, vh);
    }

    if (!shoeImgRef.current) return;

    const landmarks = results.poseLandmarks;
    let leftFoot = null;
    let rightFoot = null;

    if (autoDetectRef.current && landmarks) {
      // Smooth landmarks
      if (!smoothedLandmarksRef.current) {
        smoothedLandmarksRef.current = [...landmarks];
      } else {
        smoothedLandmarksRef.current = smoothedLandmarksRef.current.map((prev, i) =>
          smoothLandmark(prev, landmarks[i])
        );
      }
      const sm = smoothedLandmarksRef.current;

      const lHeel = sm[LEFT_HEEL];
      const lToe = sm[LEFT_FOOT_INDEX];
      const rHeel = sm[RIGHT_HEEL];
      const rToe = sm[RIGHT_FOOT_INDEX];

      if (lHeel?.visibility > 0.45 && lToe?.visibility > 0.45) {
        // Mirror x coords for front cam
        const lhx = isFrontCam ? 1 - lHeel.x : lHeel.x;
        const ltx = isFrontCam ? 1 - lToe.x : lToe.x;
        const cx = ((lhx + ltx) / 2) * vw;
        const cy = ((lHeel.y + lToe.y) / 2) * vh;
        const len = Math.hypot((ltx - lhx) * vw, (lToe.y - lHeel.y) * vh);
        const angle = Math.atan2((lToe.y - lHeel.y) * vh, (ltx - lhx) * vw);
        leftFoot = { cx, cy, len, angle };
      }
      if (rHeel?.visibility > 0.45 && rToe?.visibility > 0.45) {
        const rhx = isFrontCam ? 1 - rHeel.x : rHeel.x;
        const rtx = isFrontCam ? 1 - rToe.x : rToe.x;
        const cx = ((rhx + rtx) / 2) * vw;
        const cy = ((rHeel.y + rToe.y) / 2) * vh;
        const len = Math.hypot((rtx - rhx) * vw, (rToe.y - rHeel.y) * vh);
        const angle = Math.atan2((rToe.y - rHeel.y) * vh, (rtx - rhx) * vw);
        rightFoot = { cx, cy, len, angle };
      }

      const detected = !!(leftFoot || rightFoot);
      if (detected !== footsDetectedRef.current) {
        footsDetectedRef.current = detected;
        setFootsDetected(detected);
      }
    }

    const drawShoe = (cx, cy, w, h, angle, flipH) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      if (flipH) ctx.scale(-1, 1);
      // Drop shadow for realism
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.globalAlpha = 0.93;
      ctx.drawImage(shoeImgRef.current, -w / 2, -h / 2, w, h);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    if ((leftFoot || rightFoot) && autoDetectRef.current) {
      if (leftFoot) {
        const w = Math.max(leftFoot.len * 2.4, 80) * manualScaleRef.current;
        drawShoe(leftFoot.cx, leftFoot.cy, w, w * 0.45, leftFoot.angle, false);
      }
      if (rightFoot) {
        const w = Math.max(rightFoot.len * 2.4, 80) * manualScaleRef.current;
        drawShoe(rightFoot.cx, rightFoot.cy, w, w * 0.45, rightFoot.angle, true);
      }
    } else {
      // Manual fallback
      const cx = (manualPosRef.current.x / 100) * vw;
      const cy = (manualPosRef.current.y / 100) * vh;
      const w = vw * 0.30 * manualScaleRef.current;
      drawShoe(cx, cy, w, w * 0.45, 0, false);
    }
  }, []);

  const initPose = useCallback(async (video, isFrontCam) => {
    await Promise.all([
      loadScript(MEDIAPIPE_POSE_CDN),
      loadScript(MEDIAPIPE_CAM_UTILS),
    ]);

    if (poseRef.current) { poseRef.current.close(); poseRef.current = null; }

    const pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    pose.onResults((results) => drawFrame(results, isFrontCam));
    await pose.initialize();
    poseRef.current = pose;

    if (cameraUtilRef.current) { cameraUtilRef.current.stop(); cameraUtilRef.current = null; }

    const cam = new window.Camera(video, {
      onFrame: async () => {
        if (poseRef.current && video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
          await poseRef.current.send({ image: video });
        }
      },
      width: 1280, height: 720,
    });
    await cam.start();
    cameraUtilRef.current = cam;
  }, [drawFrame]);

  const startCamera = useCallback(async (facing) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = stream;
    const video = videoRef.current;
    video.srcObject = stream;
    await video.play();
    return stream;
  }, []);

  const startAR = useCallback(async (facing = "environment") => {
    setLoading(true);
    setError(null);
    smoothedLandmarksRef.current = null;
    try {
      setLoadingMsg("Starting camera…");
      await startCamera(facing);
      setLoadingMsg("Loading AI model…");
      await initPose(videoRef.current, facing === "user");
      setCameraActive(true);
    } catch (e) {
      console.error(e);
      setError(e.name === "NotAllowedError"
        ? "Camera access denied. Please allow camera permissions."
        : "Failed to start AR. " + (e.message || "Please try again."));
    }
    setLoading(false);
    setLoadingMsg("");
  }, [startCamera, initPose]);

  const stopAR = useCallback(() => {
    cameraUtilRef.current?.stop?.();
    cameraUtilRef.current = null;
    poseRef.current?.close?.();
    poseRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    smoothedLandmarksRef.current = null;
    setCameraActive(false);
    setFootsDetected(false);
    footsDetectedRef.current = false;
  }, []);

  const flipCamera = useCallback(async () => {
    if (switching) return;
    setSwitching(true);
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    facingModeRef.current = newFacing;
    smoothedLandmarksRef.current = null;
    setFootsDetected(false);
    footsDetectedRef.current = false;

    try {
      setLoadingMsg("Switching camera…");
      await startCamera(newFacing);
      await initPose(videoRef.current, newFacing === "user");
    } catch (e) {
      console.error(e);
    }
    setLoadingMsg("");
    setSwitching(false);
  }, [facingMode, switching, startCamera, initPose]);

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
    }, "image/jpeg", 0.92);
  };

  // Drag to reposition (manual mode)
  const handlePointerDown = (e) => {
    if (footsDetected && autoDetect) return;
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, ox: manualPos.x, oy: manualPos.y });
  };
  const handlePointerMove = (e) => {
    if (!dragging || !dragStart) return;
    const rect = canvasRef.current?.parentElement?.getBoundingClientRect();
    if (!rect) return;
    setManualPos({
      x: Math.max(5, Math.min(95, dragStart.ox + ((e.clientX - dragStart.x) / rect.width) * 100)),
      y: Math.max(5, Math.min(95, dragStart.oy + ((e.clientY - dragStart.y) / rect.height) * 100)),
    });
  };
  const handlePointerUp = () => setDragging(false);

  const statusText = cameraActive
    ? footsDetected && autoDetect
      ? "✓ Foot detected — shoe auto-fitted"
      : autoDetect
        ? "Point camera at your feet"
        : "Drag shoe to position · use slider to resize"
    : "AI-powered foot detection & shoe overlay";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.25 }}
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0 bg-card">
          <div className="flex items-center gap-3">
            {shoePreview && (
              <img src={shoePreview} alt={shoe.name} className="h-10 w-10 object-contain rounded-lg bg-secondary p-1" />
            )}
            <div>
              <h2 className="font-heading font-bold text-sm flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-primary" />
                AR Try-On
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">AI</span>
              </h2>
              <p className="text-xs text-muted-foreground">{shoe.brand} — {shoe.name}</p>
            </div>
          </div>
          <button onClick={() => { stopAR(); onClose(); }} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div
          className="relative bg-black flex-shrink-0 overflow-hidden"
          style={{ aspectRatio: "4/3" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <video ref={videoRef} className="hidden" muted playsInline />
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover"
            style={{ cursor: cameraActive && !(footsDetected && autoDetect) ? (dragging ? "grabbing" : "grab") : "default" }}
            onPointerDown={handlePointerDown}
          />

          {/* Overlaid controls when camera is active */}
          {cameraActive && (
            <>
              {/* Status pill — top left */}
              <div className="absolute top-3 left-3">
                {footsDetected && autoDetect ? (
                  <div className="flex items-center gap-1.5 bg-green-500/90 text-white text-xs px-3 py-1.5 rounded-full font-semibold backdrop-blur-sm shadow-lg">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Foot detected
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-black/60 text-white/80 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {autoDetect ? "Scanning…" : "Manual"}
                  </div>
                )}
              </div>

              {/* Top-right buttons: flip + auto/manual */}
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={flipCamera}
                  disabled={switching}
                  className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-semibold backdrop-blur-sm hover:bg-black/80 transition-all disabled:opacity-50"
                  title="Flip camera"
                >
                  {switching ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlipHorizontal className="w-3 h-3" />}
                  {facingMode === "environment" ? "Back" : "Front"}
                </button>
                <button
                  onClick={() => setAutoDetect(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold backdrop-blur-sm transition-all ${
                    autoDetect ? "bg-primary/90 text-white shadow-lg" : "bg-black/60 text-white/80 hover:bg-black/80"
                  }`}
                >
                  <Wand2 className="w-3 h-3" />
                  {autoDetect ? "Auto" : "Manual"}
                </button>
              </div>
            </>
          )}

          {/* Pre-start / loading / error overlay */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
              {loading ? (
                <>
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">{loadingMsg}</p>
                    <p className="text-xs text-white/40 mt-1">Hang tight…</p>
                  </div>
                </>
              ) : error ? (
                <div className="text-center px-8 max-w-sm">
                  <p className="text-4xl mb-3">⚠️</p>
                  <p className="text-sm text-red-300 leading-relaxed mb-4">{error}</p>
                  <button
                    onClick={() => startAR(facingMode)}
                    className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="text-center px-8 max-w-sm">
                  {shoePreview ? (
                    <img src={shoePreview} alt={shoe.name} className="h-20 mx-auto drop-shadow-2xl mb-4 object-contain" />
                  ) : (
                    <div className="text-5xl mb-4">👟</div>
                  )}
                  <p className="font-heading font-bold text-base mb-1">{shoe.name}</p>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Point your camera at your feet — AI detects and overlays the shoe automatically
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls panel */}
        <div className="px-5 py-4 space-y-3 flex-shrink-0 bg-card">
          {cameraActive && (
            <div className="flex items-center gap-3">
              <ZoomOut className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="range" min={0.4} max={3} step={0.05}
                value={manualScale}
                onChange={e => setManualScale(parseFloat(e.target.value))}
                className="flex-1 accent-primary h-1.5"
              />
              <ZoomIn className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">{Math.round(manualScale * 100)}%</span>
            </div>
          )}

          <div className="flex gap-2">
            {!cameraActive ? (
              <button
                onClick={() => startAR(facingMode)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {loading ? loadingMsg : "Start AR Try-On"}
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
                  title="Reset"
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

          <p className="text-[11px] text-muted-foreground text-center">{statusText}</p>
        </div>
      </motion.div>
    </div>
  );
}