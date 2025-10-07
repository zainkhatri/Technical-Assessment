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
}

const FilteredVideoPlayer: React.FC<FilteredVideoPlayerProps> = ({
  src,
  filterType,
  isFilterEnabled,
  uiTheme,
  timelineMode,
  startTime,
  endTime
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [filterTimeline, setFilterTimeline] = useState<Array<{start: number, end: number, filter: string}>>([]);

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
    const processFrame = async () => {
      if (!video || !canvas || !ctx || !segmenterRef.current) return;
      if (video.paused || video.ended || video.readyState < 2) return;

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
      } else {
        // Send frame to MediaPipe for person segmentation
        await segmenterRef.current.send({ image: video });
      }

      // Calculate and update FPS
      frameCountRef.current++;
      const now = Date.now();
      if (now - lastFrameTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    // Handle MediaPipe segmentation results
    if (segmenterRef.current) {
      segmenterRef.current.onResults((results) => {
        if (!ctx || !canvas) return;

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
          applyFilter(imageData, filter);
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
    }

    // Video metadata loaded, set canvas dimensions
    const handleLoadedMetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setDuration(video.duration);
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
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Cleanup on unmount
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
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
    if (!video) return;
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
          borderRadius: '4px'
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
    <div style={getVideoContainerStyles()}>
      <video
        ref={videoRef}
        src={src}
        crossOrigin="anonymous"
        style={{ display: 'none' }}
        playsInline
        preload="auto"
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
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
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

      {/* Playback Controls */}
      <div style={{
        marginTop: '10px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <button
          onClick={handleCanvasClick}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        {uiTheme !== 'editor' && (
          <span style={{
            color: uiTheme === 'default' ? '#666' : '#ccc',
            fontSize: '14px'
          }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
      </div>
    </div>
  );
};

export default FilteredVideoPlayer;
