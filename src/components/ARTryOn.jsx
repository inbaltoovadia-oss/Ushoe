import { useState, useRef, useEffect } from "react";
import { X, Camera, CameraOff, Loader2, RotateCcw, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ARTryOn({ shoe, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [overlayPos, setOverlayPos] = useState({ x: 50, y: 70 }); // percent
  const [overlayScale, setOverlayScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (e) {
      setError("Camera access denied. Please allow camera permissions and try again.");
    }
    setLoading(false);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, ox: overlayPos.x, oy: overlayPos.y });
  };

  const handlePointerMove = (e) => {
    if (!dragging || !dragStart) return;
    const container = videoRef.current?.parentElement?.getBoundingClientRect();
    if (!container) return;
    const dx = ((e.clientX - dragStart.x) / container.width) * 100;
    const dy = ((e.clientY - dragStart.y) / container.height) * 100;
    setOverlayPos({
      x: Math.max(5, Math.min(95, dragStart.ox + dx)),
      y: Math.max(5, Math.min(95, dragStart.oy + dy)),
    });
  };

  const handlePointerUp = () => setDragging(false);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    // Draw shoe overlay
    const container = video.getBoundingClientRect();
    const shoeImg = new Image();
    shoeImg.crossOrigin = "anonymous";
    shoeImg.onload = () => {
      const shoeW = canvas.width * 0.35 * overlayScale;
      const shoeH = shoeW * 0.6;
      const sx = (overlayPos.x / 100) * canvas.width - shoeW / 2;
      const sy = (overlayPos.y / 100) * canvas.height - shoeH / 2;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(shoeImg, sx, sy, shoeW, shoeH);
      ctx.globalAlpha = 1;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${shoe.name}-try-on.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/jpeg", 0.9);
    };
    shoeImg.onerror = () => {
      // Fallback: download without shoe overlay
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ar-try-on.jpg`;
        a.click();
      }, "image/jpeg");
    };
    shoeImg.src = shoe.image_url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <span className="text-xl">👟</span> AR Try-On
            </h2>
            <p className="text-xs text-muted-foreground">{shoe.brand} {shoe.name}</p>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-2 rounded-xl hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera area */}
        <div
          className="relative bg-black aspect-video overflow-hidden select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />

          {/* Shoe overlay (draggable) */}
          {cameraActive && (
            <div
              className="absolute"
              style={{
                left: `${overlayPos.x}%`,
                top: `${overlayPos.y}%`,
                transform: `translate(-50%, -50%) scale(${overlayScale})`,
                cursor: dragging ? "grabbing" : "grab",
                width: "35%",
              }}
              onPointerDown={handlePointerDown}
            >
              <img
                src={shoe.image_url}
                alt={shoe.name}
                className="w-full drop-shadow-2xl"
                style={{ opacity: 0.92, filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6))" }}
                draggable={false}
              />
              <div className="text-center mt-1">
                <span className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded-full">drag to move</span>
              </div>
            </div>
          )}

          {/* Loading/Error/Prompt overlay */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
              {loading ? (
                <><Loader2 className="w-10 h-10 animate-spin" /><p className="text-sm">Starting camera…</p></>
              ) : error ? (
                <><p className="text-sm text-red-400 text-center max-w-xs px-4">{error}</p></>
              ) : (
                <>
                  <div className="text-6xl">📷</div>
                  <p className="text-sm text-white/70 text-center max-w-xs">
                    Point your camera at your feet to see how this shoe looks on you
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 py-4 space-y-4">
          {/* Scale slider */}
          {cameraActive && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10">Size</span>
              <input
                type="range"
                min={0.4}
                max={2.5}
                step={0.05}
                value={overlayScale}
                onChange={e => setOverlayScale(parseFloat(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(overlayScale * 100)}%</span>
            </div>
          )}

          <div className="flex gap-3">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Camera className="w-5 h-5" />
                Start AR Camera
              </button>
            ) : (
              <>
                <button
                  onClick={stopCamera}
                  className="flex items-center justify-center gap-2 bg-secondary text-foreground px-4 py-3 rounded-2xl font-medium hover:bg-secondary/80 transition-colors"
                >
                  <CameraOff className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setOverlayPos({ x: 50, y: 70 })}
                  className="flex items-center justify-center gap-2 bg-secondary text-foreground px-4 py-3 rounded-2xl font-medium hover:bg-secondary/80 transition-colors"
                  title="Reset position"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity"
                >
                  <Download className="w-5 h-5" />
                  Save Photo
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Drag the shoe overlay to position it on your foot · Use the slider to resize
          </p>
        </div>
      </motion.div>
    </div>
  );
}