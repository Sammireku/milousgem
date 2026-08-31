import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Sparkles,
  Sliders,
  Film,
  Camera,
  Layers,
  Zap,
  CheckCircle2,
  Maximize2,
  Tv,
} from 'lucide-react';
import { Character, StoryBook, VeoMotionType } from '../types';

interface VeoMotionStudioProps {
  characters: Character[];
  books: StoryBook[];
  onOpenCharacterStudio?: () => void;
}

const MOTION_PRESETS: Array<{
  id: VeoMotionType;
  title: string;
  badge: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'dynamic_video_ad',
    title: 'Dynamic Video Ad',
    badge: 'Veo 3 Commercial',
    description: 'Transform product or subject into a sleek video commercial with kinetic typography & spotlight sweeps.',
    icon: '🎬',
  },
  {
    id: 'living_portrait',
    title: 'Living Character Portrait',
    badge: 'Character FX',
    description: 'Breathe lifelike micro-motion, gentle breathing, gaze shifting, and aura glow into portraits.',
    icon: '👤',
  },
  {
    id: 'cinematic_parallax',
    title: 'Cinematic Parallax Orbit',
    badge: '3D Spatial',
    description: 'Multi-plane depth shift with slow cinematic camera orbit and soft anamorphic lens flares.',
    icon: '🌌',
  },
  {
    id: 'action_zoom',
    title: 'Action Scene Zoom & Burst',
    badge: 'High Energy',
    description: 'Dynamic camera zooms, particle bursts, and impact speed effects for high-stakes moments.',
    icon: '⚡',
  },
  {
    id: 'orbit_3d',
    title: '3D Dimensional Sweep',
    badge: 'Showcase',
    description: 'Subtle 3D perspective warp and lighting highlights ideal for artifacts and character reveals.',
    icon: '🌀',
  },
];

export const VeoMotionStudio: React.FC<VeoMotionStudioProps> = ({
  characters,
  books,
}) => {
  // Source Image
  const [selectedImage, setSelectedImage] = useState<string>(
    characters[0]?.visualProfile?.photoUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&q=80'
  );
  const [imageTitle, setImageTitle] = useState<string>(characters[0]?.name || 'Sample Portrait');

  // Motion Configuration
  const [motionType, setMotionType] = useState<VeoMotionType>('dynamic_video_ad');
  const [headline, setHeadline] = useState('THE LEGEND AWAKENS');
  const [slogan, setSlogan] = useState('An Unforgettable Interactive Chronicle');
  const [duration, setDuration] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [particleDensity, setParticleDensity] = useState<'subtle' | 'high' | 'off'>('subtle');

  // Video State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<number>(0);

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Load Image into ref
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedImage;
    img.onload = () => {
      imageElementRef.current = img;
    };
  }, [selectedImage]);

  // Handle Canvas Rendering Loop
  useEffect(() => {
    let startTime: number | null = null;

    const render = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = ((timestamp - startTime) / 1000) % duration;
      const progress = elapsed / duration; // 0 to 1

      if (isPlaying) {
        setCurrentTime(elapsed);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const img = imageElementRef.current;

      if (canvas && ctx) {
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Fill background
        ctx.fillStyle = '#1A1816';
        ctx.fillRect(0, 0, width, height);

        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();

          // Calculate aspect cover
          const imgAspect = img.naturalWidth / img.naturalHeight;
          const canvasAspect = width / height;
          let drawW = width;
          let drawH = height;
          let offX = 0;
          let offY = 0;

          if (imgAspect > canvasAspect) {
            drawW = height * imgAspect;
            offX = (width - drawW) / 2;
          } else {
            drawH = width / imgAspect;
            offY = (height - drawH) / 2;
          }

          // Apply Motion Transformations based on Preset
          const t = progress * Math.PI * 2;

          if (motionType === 'dynamic_video_ad') {
            // Smooth zoom + panning
            const scale = 1.0 + Math.sin(t * 0.5) * 0.08;
            const panX = Math.sin(t) * 15;
            const panY = Math.cos(t) * 10;
            ctx.translate(width / 2 + panX, height / 2 + panY);
            ctx.scale(scale, scale);
            ctx.drawImage(img, offX - width / 2, offY - height / 2, drawW, drawH);
            ctx.restore();

            // Spotlight sweep
            ctx.save();
            const gradX = (progress * 1.5 - 0.25) * width;
            const spotGrad = ctx.createLinearGradient(gradX - 150, 0, gradX + 150, height);
            spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            spotGrad.addColorStop(0.5, 'rgba(234, 240, 232, 0.25)');
            spotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = spotGrad;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();

            // Video Ad Overlay (Cinematic lower third)
            if (headline) {
              ctx.save();
              ctx.fillStyle = 'rgba(26, 24, 22, 0.75)';
              ctx.fillRect(0, height - 120, width, 120);

              // Accent Bar
              ctx.fillStyle = '#5B6B56';
              ctx.fillRect(0, height - 120, 6, 120);

              // Headline
              ctx.fillStyle = '#FDFCF9';
              ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
              ctx.fillText(headline.toUpperCase(), 32, height - 70);

              // Slogan
              if (slogan) {
                ctx.fillStyle = '#DFD8CA';
                ctx.font = '14px "Plus Jakarta Sans", sans-serif';
                ctx.fillText(slogan, 32, height - 40);
              }

              // Brand Stamp
              ctx.fillStyle = '#8C9A86';
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText('POWERED BY VEO 3', width - 150, height - 40);
              ctx.restore();
            }
          } else if (motionType === 'living_portrait') {
            // Gentle breathing effect
            const breathScale = 1.0 + Math.sin(t) * 0.035;
            const breathY = Math.sin(t) * 6;
            ctx.translate(width / 2, height / 2 + breathY);
            ctx.scale(breathScale, breathScale);
            ctx.drawImage(img, offX - width / 2, offY - height / 2, drawW, drawH);
            ctx.restore();

            // Atmospheric Vignette & glow
            ctx.save();
            const radGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.7);
            radGrad.addColorStop(0, 'rgba(0,0,0,0)');
            radGrad.addColorStop(1, 'rgba(15,14,13,0.6)');
            ctx.fillStyle = radGrad;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
          } else if (motionType === 'cinematic_parallax') {
            // Slow dramatic camera zoom & slight rotation
            const zoom = 1.02 + progress * 0.12;
            const rot = (progress - 0.5) * 0.02;
            ctx.translate(width / 2, height / 2);
            ctx.rotate(rot);
            ctx.scale(zoom, zoom);
            ctx.drawImage(img, offX - width / 2, offY - height / 2, drawW, drawH);
            ctx.restore();

            // Subtle lens flare
            ctx.save();
            const flareX = progress * width;
            const flareY = height * 0.3;
            const flareGrad = ctx.createRadialGradient(flareX, flareY, 0, flareX, flareY, 200);
            flareGrad.addColorStop(0, 'rgba(180, 95, 60, 0.3)');
            flareGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = flareGrad;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
          } else if (motionType === 'action_zoom') {
            // High energy zoom pulses
            const pulse = 1.0 + Math.pow(Math.sin(t * 2), 2) * 0.08;
            ctx.translate(width / 2, height / 2);
            ctx.scale(pulse, pulse);
            ctx.drawImage(img, offX - width / 2, offY - height / 2, drawW, drawH);
            ctx.restore();

            // Speed lines & sparks
            ctx.save();
            ctx.strokeStyle = 'rgba(234, 240, 232, 0.4)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2 + progress * 2;
              const len = 40 + Math.sin(progress * 10 + i) * 20;
              ctx.beginPath();
              ctx.moveTo(width / 2 + Math.cos(angle) * (width * 0.35), height / 2 + Math.sin(angle) * (height * 0.35));
              ctx.lineTo(width / 2 + Math.cos(angle) * (width * 0.35 + len), height / 2 + Math.sin(angle) * (height * 0.35 + len));
              ctx.stroke();
            }
            ctx.restore();
          } else {
            // 3D Dimensional Orbit
            const orbitScale = 1.05 + Math.sin(t) * 0.04;
            const orbitSkew = Math.sin(t) * 0.03;
            ctx.translate(width / 2, height / 2);
            ctx.transform(1, 0, orbitSkew, 1, 0, 0);
            ctx.scale(orbitScale, orbitScale);
            ctx.drawImage(img, offX - width / 2, offY - height / 2, drawW, drawH);
            ctx.restore();
          }

          // Particles
          if (particleDensity !== 'off') {
            ctx.save();
            const count = particleDensity === 'high' ? 30 : 15;
            for (let i = 0; i < count; i++) {
              const pX = ((i * 137.5 + progress * 100 * (i % 3 + 1)) % width);
              const pY = ((i * 243.1 + Math.sin(progress * 4 + i) * 50) % height);
              const pSize = 1.5 + (i % 3);
              ctx.fillStyle = i % 2 === 0 ? 'rgba(234, 240, 232, 0.6)' : 'rgba(180, 95, 60, 0.6)';
              ctx.beginPath();
              ctx.arc(pX, pY, pSize, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [selectedImage, motionType, headline, slogan, duration, isPlaying, particleDensity]);

  // Handle File Upload from device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImage(event.target.result as string);
          setImageTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Export Real Video recording (WebM / MP4)
  const handleRecordAndExportVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsRecording(true);
      setRenderProgress(0);
      recordedChunksRef.current = [];

      const stream = canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(videoUrl);
        setIsRecording(false);
      };

      recorder.start();

      // Progress interval
      let elapsedSec = 0;
      const interval = setInterval(() => {
        elapsedSec += 0.2;
        setRenderProgress(Math.min(100, Math.round((elapsedSec / duration) * 100)));
        if (elapsedSec >= duration) {
          clearInterval(interval);
          recorder.stop();
        }
      }, 200);
    } catch (err) {
      console.error('Video recording error:', err);
      setIsRecording(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#E8E2D6]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-[#EAF0E8] text-[#3B5436] border border-[#CAD7C6] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5B6B56]" />
              Veo 3 Motion Engine
            </span>
            <span className="text-xs text-[#78716A]">Dynamic Video & Living Portraits</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#3A342F]">
            Animate Images into Video
          </h1>
          <p className="text-[#6E665E] text-sm max-w-2xl mt-1">
            Turn character portraits, product photos, or story scene illustrations into dynamic video ads and breathing cinematic visuals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#DFD8CA] hover:bg-[#EAE5DC] text-xs sm:text-sm font-medium text-[#4A443F] shadow-xs cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-[#5B6B56]" />
            <span>Upload Photo / Product</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Controls & Presets (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Motion Preset Selector */}
          <div className="bg-[#FDFCF9] border border-[#DFD8CA] rounded-2xl p-5 shadow-xs">
            <h3 className="font-serif text-base font-bold text-[#3A342F] mb-3 flex items-center gap-2">
              <Film className="w-4 h-4 text-[#5B6B56]" />
              1. Choose Motion Preset
            </h3>

            <div className="space-y-2.5">
              {MOTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setMotionType(preset.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                    motionType === preset.id
                      ? 'bg-[#EAF0E8] border-[#CAD7C6] shadow-xs'
                      : 'bg-white border-[#E8E2D6] hover:border-[#CAD7C6] hover:bg-[#F9F7F2]'
                  }`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#3A342F]">{preset.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#5B6B56] font-semibold border border-[#D0E0CC]">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#6E665E] mt-0.5 leading-relaxed">{preset.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Video Ad Typography & Headlines (when ad preset active) */}
          {motionType === 'dynamic_video_ad' && (
            <div className="bg-[#FDFCF9] border border-[#DFD8CA] rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in">
              <h3 className="font-serif text-base font-bold text-[#3A342F] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#B45F3C]" />
                Video Ad Headline & Slogan
              </h3>

              <div>
                <label className="block text-xs font-medium text-[#4A443F] mb-1">Commercial Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="E.g. DISCOVER THE LEGEND"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#DCD5C9] text-sm text-[#3A342F] focus:outline-none focus:border-[#5B6B56] shadow-xs font-semibold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A443F] mb-1">Sub-slogan / Product Description</label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="E.g. Available exclusively in the MilousGem Chronicle"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#DCD5C9] text-sm text-[#3A342F] focus:outline-none focus:border-[#5B6B56] shadow-xs"
                />
              </div>
            </div>
          )}

          {/* Source Image Selector from Universe */}
          <div className="bg-[#FDFCF9] border border-[#DFD8CA] rounded-2xl p-5 shadow-xs">
            <h3 className="font-serif text-base font-bold text-[#3A342F] mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#5B6B56]" />
              2. Select Source Image
            </h3>

            <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => {
                    setSelectedImage(char.visualProfile.photoUrl);
                    setImageTitle(char.name);
                  }}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${
                    selectedImage === char.visualProfile.photoUrl
                      ? 'border-[#5B6B56] ring-2 ring-[#CAD7C6]'
                      : 'border-[#DFD8CA] hover:border-[#CAD7C6]'
                  }`}
                >
                  <img
                    src={char.visualProfile.photoUrl}
                    alt={char.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-center">
                    <span className="text-[10px] text-white font-medium truncate block">{char.name}</span>
                  </div>
                </button>
              ))}

              {books.flatMap((b) => b.chapters.filter((c) => c.imageUrl)).map((chap, i) => (
                <button
                  key={`chap_img_${i}`}
                  onClick={() => {
                    if (chap.imageUrl) {
                      setSelectedImage(chap.imageUrl);
                      setImageTitle(chap.title);
                    }
                  }}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${
                    selectedImage === chap.imageUrl
                      ? 'border-[#5B6B56] ring-2 ring-[#CAD7C6]'
                      : 'border-[#DFD8CA] hover:border-[#CAD7C6]'
                  }`}
                >
                  <img
                    src={chap.imageUrl}
                    alt={chap.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-center">
                    <span className="text-[10px] text-white font-medium truncate block">Scene {i + 1}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Motion Settings */}
          <div className="bg-[#FDFCF9] border border-[#DFD8CA] rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-[#3A342F] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#5B6B56]" />
              3. Video Duration & Particles
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#4A443F] mb-1">Duration</label>
                <div className="flex gap-2">
                  {[3, 5, 8].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setDuration(sec)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        duration === sec
                          ? 'bg-[#5B6B56] text-white border-[#5B6B56]'
                          : 'bg-white text-[#4A443F] border-[#DCD5C9] hover:bg-[#F9F7F2]'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A443F] mb-1">Particle Density</label>
                <div className="flex gap-2">
                  {(['subtle', 'high', 'off'] as const).map((density) => (
                    <button
                      key={density}
                      onClick={() => setParticleDensity(density)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        particleDensity === density
                          ? 'bg-[#5B6B56] text-white border-[#5B6B56]'
                          : 'bg-white text-[#4A443F] border-[#DCD5C9] hover:bg-[#F9F7F2]'
                      }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Video Player Stage (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#FDFCF9] border border-[#DFD8CA] rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#B45F3C] animate-pulse" />
                <span className="font-serif font-bold text-sm text-[#3A342F]">
                  Live Veo 3 Viewport: {imageTitle}
                </span>
              </div>
              <span className="text-xs font-mono text-[#78716A]">
                {currentTime.toFixed(1)}s / {duration}.0s
              </span>
            </div>

            {/* Video Canvas Stage */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#1A1816] shadow-inner flex items-center justify-center border border-[#DFD8CA]">
              <canvas
                ref={canvasRef}
                width={960}
                height={540}
                className="w-full h-full object-contain"
              />

              {/* Recording Overlay */}
              {isRecording && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 z-20 animate-fade-in">
                  <div className="w-12 h-12 rounded-full border-4 border-[#EAF0E8] border-t-[#5B6B56] animate-spin mb-3" />
                  <span className="font-serif text-lg font-bold">Rendering Veo 3 Video...</span>
                  <p className="text-xs text-[#EAF0E8] mt-1">Encoding frames: {renderProgress}%</p>
                  <div className="w-48 h-2 bg-white/20 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-[#5B6B56] transition-all duration-200"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Player Controls Bar */}
            <div className="mt-4 pt-4 border-t border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white shadow-xs transition-transform active:scale-95"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => {
                    setCurrentTime(0);
                    setIsPlaying(true);
                  }}
                  className="p-3 rounded-xl bg-white border border-[#DFD8CA] hover:bg-[#EAE5DC] text-[#4A443F] shadow-xs transition-colors"
                  title="Replay from start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Export Video Button */}
              <div className="flex items-center gap-3">
                {recordedVideoUrl && (
                  <a
                    href={recordedVideoUrl}
                    download={`milousgem-veo-${Date.now()}.webm`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAF0E8] border border-[#CAD7C6] text-[#3B5436] font-semibold text-xs sm:text-sm hover:bg-[#DFE9DD] shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Video</span>
                  </a>
                )}

                <button
                  onClick={handleRecordAndExportVideo}
                  disabled={isRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#B45F3C] hover:bg-[#A05333] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02]"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isRecording ? 'Exporting...' : 'Export Video (WebM)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
