import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, Sparkles } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageBase64: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize camera stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCountdown(null);
      setErrorMsg(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setErrorMsg(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1080 },
          aspectRatio: 1,
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings, or upload an image instead.'
          : 'Unable to access camera on this device. Please check hardware connection or upload an image.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const triggerCountdownCapture = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 800);
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight) || 640;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    if (facingMode === 'user') {
      // Mirror horizontal for natural selfie feel
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3A342F]/70 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-[#FDFCF9] border border-[#DFD8CA] rounded-3xl shadow-2xl overflow-hidden text-[#4A443F]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E8E2D6] bg-[#F5EFEB]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EAF0E8] border border-[#CAD7C6] flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4 text-[#5B6B56]" />
            </div>
            <h3 className="font-serif text-sm sm:text-base font-bold text-[#3A342F]">Capture Character Portrait</h3>
          </div>
          <button
            id="camera-modal-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#78716A] hover:text-[#3A342F] hover:bg-[#EAE5DC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview */}
        <div className="relative aspect-square w-full bg-[#2E2A27] flex items-center justify-center overflow-hidden">
          {errorMsg ? (
            <div className="p-6 text-center text-[#F2D0C4] space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-[#B45F3C]" />
              <p className="text-xs leading-relaxed text-[#F7EFEA]">{errorMsg}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-lg bg-[#4A443F] hover:bg-[#5E5751] text-xs text-white transition-colors shadow-xs"
              >
                Retry Camera
              </button>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full">
              <img
                src={capturedImage}
                alt="Captured Portrait"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#5B6B56]/90 backdrop-blur-sm text-white text-xs font-semibold flex items-center gap-1.5 shadow">
                <Check className="w-3.5 h-3.5" /> Portrait Captured
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-8 border border-[#8C9A86]/40 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-[#EAF0E8]" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-[#EAF0E8]" />
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-medium text-white bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20">
                    Align character face inside frame
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-[#EAF0E8]" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-[#EAF0E8]" />
                </div>
              </div>

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                  <span className="text-7xl font-bold font-serif text-[#F9F7F2] animate-ping">
                    {countdown}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Hidden Canvas for capture rendering */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 bg-[#F5EFEB] border-t border-[#E8E2D6] flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                id="camera-retake-btn"
                onClick={handleRetake}
                className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#EAE5DC] text-[#4A443F] border border-[#DFD8CA] font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Retake
              </button>
              <button
                id="camera-confirm-btn"
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" /> Use Portrait
              </button>
            </>
          ) : (
            <>
              <button
                id="camera-flip-btn"
                onClick={toggleFacingMode}
                className="p-3 rounded-xl bg-white hover:bg-[#EAE5DC] border border-[#DFD8CA] text-[#4A443F] shadow-xs transition-colors"
                title="Switch Camera Facing"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                id="camera-snap-btn"
                onClick={takeSnapshot}
                disabled={!stream || errorMsg !== null}
                className="flex-1 py-3 rounded-xl bg-[#B45F3C] hover:bg-[#A05333] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Camera className="w-4 h-4" /> Snap Snapshot
              </button>

              <button
                id="camera-timer-btn"
                onClick={triggerCountdownCapture}
                disabled={!stream || errorMsg !== null || countdown !== null}
                className="px-3.5 py-3 rounded-xl bg-white hover:bg-[#EAE5DC] border border-[#DFD8CA] disabled:opacity-50 text-[#4A443F] text-xs font-semibold shadow-xs transition-colors"
                title="3-Second Timer"
              >
                3s Timer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
