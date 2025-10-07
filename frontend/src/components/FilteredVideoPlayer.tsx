import React, { useRef, useEffect, useState } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

interface FilteredVideoPlayerProps {
  src: string;
  filterType: string;
  isFilterEnabled: boolean;
  uiTheme: 'default' | 'theater' | 'window' | 'editor';
  timelineMode: boolean;
  startTime: number;
  endTime: number;
  onDurationChange?: (duration: number) => void;
}

const FilteredVideoPlayer: React.FC<FilteredVideoPlayerProps> = ({
  src,
  filterType,
  isFilterEnabled,
  uiTheme,
  timelineMode,
  startTime,
  endTime,
  onDurationChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [filterTimeline, setFilterTimeline] = useState<Array<{start: number, end: number, filter: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // MediaPipe and animation refs
  const segmenterRef = useRef<SelfieSegmentation | null>(null);
  const animationFrameRef = useRef<number>();
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(Date.now());

  // Refs to avoid stale closures in animation loop
  const currentFilterRef = useRef<string>(filterType);
  const isFilterEnabledRef = useRef<boolean>(isFilterEnabled);
  const timelineModeRef = useRef<boolean>(timelineMode);
  const startTimeRef = useRef<number>(startTime);
  const endTimeRef = useRef<number>(endTime);

  // Keep refs in sync with props
  useEffect(() => {
    currentFilterRef.current = filterType;
  }, [filterType]);

  useEffect(() => {
    isFilterEnabledRef.current = isFilterEnabled;
  }, [isFilterEnabled]);

  useEffect(() => {
    timelineModeRef.current = timelineMode;
    startTimeRef.current = startTime;
    endTimeRef.current = endTime;
  }, [timelineMode, startTime, endTime]);

  // Initialize MediaPipe on mount
  useEffect(() => {
    const segmenter = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    segmenter.setOptions({ modelSelection: 1 }); // 1 = higher accuracy, 0 = faster

    // Set up the onResults callback immediately during initialization
    segmenter.onResults((results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const filter = currentFilterRef.current;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Step 1: Draw entire frame with filter applied
      ctx.save();
      if (filter === 'blur') {
        ctx.filter = 'blur(10px)'; // Use GPU accelerated CSS filter
      }
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (filter !== 'blur') {
        // Apply grayscale or sepia via pixel manipulation
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Apply pixel level filters
        const data = imageData.data;
        if (filter === 'grayscale') {
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = data[i + 1] = data[i + 2] = gray;
          }
        } else if (filter === 'sepia') {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
            data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
            data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
      ctx.restore();

      // Step 2: Cut out person using segmentation mask
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

      // Step 3: Draw original person behind filtered background
      ctx.globalCompositeOperation = 'destination-over';
      ctx.filter = 'none';
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    });

    segmenterRef.current = segmenter;

    return () => {
      segmenter.close();
    };
  }, []);

  // Process video frames
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply pixel level filters to image data
    const applyFilter = (imageData: ImageData, filter: string) => {
      const data = imageData.data;

      if (filter === 'grayscale') {
        // Convert RGB to grayscale using luminosity formula
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
      } else if (filter === 'sepia') {
        // Apply sepia tone color matrix
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
          data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
          data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
        }
      }

      return imageData;
    };

    // Main frame processing loop
    const processFrame = () => {
      if (!video || !canvas || !ctx) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }
      if (video.paused || video.ended) {
        return;
      }
      if (video.readyState < 2) {
        // Not enough data yet, wait and try again
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Match canvas size to video dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Determine if filter should be active based on timeline settings
      const shouldApplyFilter = isFilterEnabledRef.current && (
        !timelineModeRef.current ||
        (video.currentTime >= startTimeRef.current && video.currentTime <= endTimeRef.current)
      );

      if (!shouldApplyFilter) {
        // Just display original video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Schedule next frame
        animationFrameRef.current = requestAnimationFrame(processFrame);
      } else {
        // Send frame to MediaPipe for person segmentation
        if (segmenterRef.current) {
          segmenterRef.current.send({ image: video }).then(() => {
            // Schedule next frame after MediaPipe processing
            animationFrameRef.current = requestAnimationFrame(processFrame);
          }).catch((err) => {
            console.error('MediaPipe error:', err);
            // Continue processing even on error
            animationFrameRef.current = requestAnimationFrame(processFrame);
          });
        } else {
          // Fallback if segmenter not ready
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          animationFrameRef.current = requestAnimationFrame(processFrame);
        }
      }

      // Calculate and update FPS
      frameCountRef.current++;
      const now = Date.now();
      if (now - lastFrameTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }
    };


    // Video metadata loaded, set canvas dimensions
    const handleLoadedMetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setDuration(video.duration);
      setIsLoading(true);
      // Notify parent of duration change
      if (onDurationChange) {
        onDurationChange(video.duration);
      }
    };

    // When video has enough data, draw preview
    const handleCanPlay = () => {
      setIsLoading(false);
      if (!isPlaying && video.paused) {
        // Reset to start for preview
        video.currentTime = 0;
        // Draw first frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    };

    // Draw preview frame when seeked
    const handleSeeked = () => {
      if (video.paused && !isPlaying) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    };

    // Update time display
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    // Start frame processing loop when video plays
    const handlePlay = () => {
      setIsPlaying(true);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      processFrame();
    };

    // Start processing when video has enough data to play
    const handleCanPlayThrough = () => {
      setIsLoading(false);
      if (!video.paused && !animationFrameRef.current) {
        processFrame();
      }
    };

    // Stop frame processing when video pauses
    const handlePause = () => {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    // Stop frame processing when video ends
    const handleEnded = () => {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    // Attach event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Cleanup on unmount
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Toggle play/pause on canvas click
  const handleCanvasClick = () => {
    const video = videoRef.current;
    if (!video || isLoading) return; // Prevent play while loading
    if (video.paused || video.ended) {
      if (video.ended) {
        video.currentTime = 0;
      }
      video.play();
    } else {
      video.pause();
    }
  };

  // Format seconds as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Seek to specific time
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = parseFloat(e.target.value);
  };

  const getVideoContainerStyles = () => {
    const baseStyles: React.CSSProperties = {
      position: 'relative',
      display: 'inline-block',
      width: '100%',
      maxWidth: '1000px'
    };

    switch (uiTheme) {
      case 'theater':
        return {
          ...baseStyles,
          boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 100px rgba(0,0,0,0.5)',
          padding: '30px',
          background: 'linear-gradient(145deg, #0a0a0a 0%, #000 100%)',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.05)'
        };
      case 'window':
        return {
          ...baseStyles,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          border: '8px solid rgba(255,255,255,0.2)'
        };
      case 'editor':
        return {
          ...baseStyles,
          border: '1px solid #3c3c3c',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        };
      default:
        return baseStyles;
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}
      </style>
      <div style={getVideoContainerStyles()}>
      <video
        ref={videoRef}
        src={src}
        style={{ display: 'none' }}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        onError={(e) => console.error('Video error:', e)}
        onLoadedData={() => console.log('Video loaded successfully')}
      />
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '2px',
          cursor: 'pointer',
          backgroundColor: '#000',
          display: 'block',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          border: '3px solid rgba(255,255,255,0.15)'
        }}
      />

      {/* FPS Counter */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        {isPlaying ? `${fps} FPS` : 'Paused'}
      </div>

      {/* Timeline Controls */}
      {uiTheme === 'editor' && (
        <div style={{
          background: '#252526',
          padding: '15px',
          borderTop: '1px solid #3c3c3c'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px'
          }}>
            <span style={{ color: '#ccc', fontSize: '12px', minWidth: '40px' }}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              style={{
                flex: 1,
                cursor: 'pointer'
              }}
            />
            <span style={{ color: '#ccc', fontSize: '12px', minWidth: '40px' }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}

      {/* Center Play/Pause Button */}
      {!isPlaying && !isLoading && (
        <div
          onClick={handleCanvasClick}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '3px solid rgba(255, 255, 255, 0.9)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      )}

      {/* Video Progress Bar */}
      <div style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        padding: '15px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{
          color: 'white',
          fontSize: '12px',
          minWidth: '45px',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
        }}>
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          style={{
            flex: 1,
            cursor: 'pointer',
            height: '6px',
            borderRadius: '3px',
            background: `linear-gradient(to right, #007bff 0%, #007bff ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) 100%)`,
            outline: 'none',
            WebkitAppearance: 'none',
          }}
        />
        <span style={{
          color: 'white',
          fontSize: '12px',
          minWidth: '45px',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
        }}>
          {formatTime(duration)}
        </span>
      </div>
    </div>
    </>
  );
};

export default FilteredVideoPlayer;
