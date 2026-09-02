import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette,
  Printer,
  Download,
  X,
  Sparkles,
  Sliders,
  Heart,
  BookOpen,
  Check,
} from 'lucide-react';
import { StoryBook, StoryChapter } from '../types';

interface ColoringPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: StoryBook;
  chapter: StoryChapter;
}

export const ColoringPageModal: React.FC<ColoringPageModalProps> = ({
  isOpen,
  onClose,
  book,
  chapter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [outlineIntensity, setOutlineIntensity] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [dedicationName, setDedicationName] = useState<string>('');
  const [giverName, setGiverName] = useState<string>('');
  const [includeDedication, setIncludeDedication] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !chapter.imageUrl) return;

    setIsProcessing(true);
    setImageError(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.src = chapter.imageUrl;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 800;
      const height = Math.round((img.height / img.width) * width);
      canvas.width = width;
      canvas.height = height;

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Sobel / Laplacian Edge Detection filter for clean coloring page outlines
        const grayscale = new Float32Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          grayscale[i / 4] = gray;
        }

        const threshold = 18 + (100 - outlineIntensity) * 0.45;
        const output = ctx.createImageData(width, height);
        const outData = output.data;

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gx =
              -1 * grayscale[idx - width - 1] +
              1 * grayscale[idx - width + 1] +
              -2 * grayscale[idx - 1] +
              2 * grayscale[idx + 1] +
              -1 * grayscale[idx + width - 1] +
              1 * grayscale[idx + width + 1];

            const gy =
              -1 * grayscale[idx - width - 1] +
              -2 * grayscale[idx - width] +
              -1 * grayscale[idx - width + 1] +
              1 * grayscale[idx + width - 1] +
              2 * grayscale[idx + width] +
              1 * grayscale[idx + width + 1];

            const mag = Math.sqrt(gx * gx + gy * gy);
            const isEdge = mag > threshold;

            const outIdx = idx * 4;
            if (isEdge) {
              outData[outIdx] = 30; // dark line
              outData[outIdx + 1] = 30;
              outData[outIdx + 2] = 30;
              outData[outIdx + 3] = 255;
            } else {
              outData[outIdx] = 255; // white fill
              outData[outIdx + 1] = 255;
              outData[outIdx + 2] = 255;
              outData[outIdx + 3] = 255;
            }
          }
        }

        ctx.putImageData(output, 0, 0);
        setIsProcessing(false);
      } catch (e) {
        console.warn('Canvas security or CORS error on coloring outline, rendering black & white filter', e);
        // Fallback filter
        ctx.filter = 'grayscale(100%) contrast(300%) invert(100%)';
        ctx.drawImage(img, 0, 0, width, height);
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      setImageError(true);
      setIsProcessing(false);
    };
  }, [isOpen, chapter.imageUrl, outlineIntensity]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${book.title.replace(/\s+/g, '_')}_Ch${chapter.chapterNumber}_Coloring_Page.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-[#FAF8F5] border border-[#DFD8CA] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#4A443F]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#E8E2D6] bg-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FDF0EB] border border-[#FAD6C8] flex items-center justify-center text-[#B45F3C]">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#B45F3C]">
                  Printable Storybook Keepsake
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#3A342F]">
                  Coloring Page & Dedication Studio
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Page</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#78716A] hover:text-[#3A342F] hover:bg-[#F5EFEB] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto p-4 sm:p-6 gap-6">
            {/* Left Canvas Preview */}
            <div className="md:col-span-7 flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-[#DFD8CA] shadow-inner min-h-[380px]">
              {includeDedication && (
                <div className="w-full text-center py-2 mb-3 border-b border-dashed border-[#DFD8CA]">
                  <p className="font-serif italic text-sm text-[#3A342F]">
                    "This magical story belongs to{' '}
                    <strong>{dedicationName || 'a special young reader'}</strong>
                    {giverName ? `, gifted with endless love by ${giverName}` : ''}"
                  </p>
                </div>
              )}

              <div className="relative w-full flex items-center justify-center overflow-hidden rounded-xl bg-white border border-[#E0D8CA]">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[420px] object-contain"
                />

                {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-xs font-bold text-[#5B6B56]">
                    <Sparkles className="w-6 h-6 animate-spin text-[#B45F3C]" />
                    <span>Extracting outline line-art...</span>
                  </div>
                )}

                {imageError && (
                  <div className="p-6 text-center text-xs text-[#78716A]">
                    Could not load chapter image for outline conversion.
                  </div>
                )}
              </div>

              {/* Caption Under Coloring Page */}
              <div className="w-full mt-3 flex items-center justify-between text-xs text-[#78716A]">
                <span className="font-serif font-bold text-[#3A342F]">
                  {book.title} — Chapter {chapter.chapterNumber}
                </span>
                <span>Ready for crayons & colored pencils</span>
              </div>
            </div>

            {/* Right Controls & Customization */}
            <div className="md:col-span-5 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Outline Thickness Slider */}
                <div className="p-4 rounded-2xl bg-white border border-[#DFD8CA] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#3A342F]">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-[#5B6B56]" />
                      <span>Outline Sensitivity</span>
                    </span>
                    <span className="text-[#5B6B56]">{outlineIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={outlineIntensity}
                    onChange={(e) => setOutlineIntensity(Number(e.target.value))}
                    className="w-full accent-[#5B6B56]"
                  />
                  <p className="text-[11px] text-[#78716A]">
                    Slide left for softer lines, or slide right for bold outlines.
                  </p>
                </div>

                {/* Dedication Plate Toggle */}
                <div className="p-4 rounded-2xl bg-white border border-[#DFD8CA] space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeDedication}
                      onChange={(e) => setIncludeDedication(e.target.checked)}
                      className="rounded accent-[#5B6B56] w-4 h-4"
                    />
                    <span className="text-xs font-bold text-[#3A342F] flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-[#B45F3C]" />
                      <span>Add Custom Dedication Header</span>
                    </span>
                  </label>

                  {includeDedication && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-[#78716A]">
                          Child's Name:
                        </label>
                        <input
                          type="text"
                          value={dedicationName}
                          onChange={(e) => setDedicationName(e.target.value)}
                          placeholder="e.g. Zula"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DFD8CA] text-xs text-[#3A342F] focus:outline-none focus:border-[#5B6B56]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#78716A]">
                          Gifted By (Optional):
                        </label>
                        <input
                          type="text"
                          value={giverName}
                          onChange={(e) => setGiverName(e.target.value)}
                          placeholder="e.g. Mom & Dad"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DFD8CA] text-xs text-[#3A342F] focus:outline-none focus:border-[#5B6B56]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Download Image Button */}
              <button
                onClick={handleDownload}
                className="w-full py-3 px-4 rounded-2xl bg-[#FAF8F5] hover:bg-[#EAE5DC] border border-[#DFD8CA] text-xs font-bold text-[#3A342F] flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4 text-[#5B6B56]" />
                <span>Save PNG Coloring Sheet</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
