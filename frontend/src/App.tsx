import React, { useState } from 'react';
import FilteredVideoPlayer from './components/FilteredVideoPlayer';
import { videoUrl } from './consts';

export interface FaceDetection {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    label?: string;
  }

const App: React.FC = () => {
  // Filter settings
  const [filterType, setFilterType] = useState<string>('grayscale');
  const [isFilterEnabled, setIsFilterEnabled] = useState<boolean>(true);

  // Video source
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(videoUrl);

  // Timeline controls
  const [timelineMode, setTimelineMode] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(10);

  // Handle video file upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setCurrentVideoUrl(url);
    }
  };

  return (
    <div style={{
      background: '#000',
      minHeight: '100vh',
      width: '100%',
      padding: '50px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Theater Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '50px',
        maxWidth: '1200px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '3.5em',
          fontWeight: '200',
          color: '#fff',
          marginBottom: '15px',
          letterSpacing: '8px',
          textTransform: 'uppercase'
        }}>
          Cinema Filter
        </h1>
        <p style={{
          color: '#666',
          fontSize: '1em',
          fontWeight: '300',
          letterSpacing: '2px'
        }}>
          Real-time background filtering in your browser
        </p>
      </div>

      {/* Video Player */}
      <div style={{
        marginBottom: '60px',
        width: '100%',
        maxWidth: '1100px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <FilteredVideoPlayer
          src={currentVideoUrl}
          filterType={filterType}
          isFilterEnabled={isFilterEnabled}
          uiTheme="theater"
          timelineMode={timelineMode}
          startTime={startTime}
          endTime={endTime}
        />
      </div>

      {/* Controls Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '25px',
        maxWidth: '1100px',
        width: '100%',
        padding: '0 20px'
      }}>
        {/* Video Upload */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '25px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{
            marginBottom: '15px',
            fontSize: '1.1em',
            color: '#fff',
            fontWeight: '300',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>Upload Video</h3>
          <label
            style={{
              display: 'block',
              padding: '20px',
              borderRadius: '8px',
              border: '2px dashed rgba(255,255,255,0.3)',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)',
              color: '#888',
              textAlign: 'center',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
            }}
          >
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              style={{ display: 'none' }}
            />
            📁 Choose a video file
          </label>
        </div>

        {/* Filter Controls */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '25px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{
            marginBottom: '15px',
            fontSize: '1.1em',
            color: '#fff',
            fontWeight: '300',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>Filter Controls</h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              fontSize: '1em',
              color: '#ccc'
            }}>
              <input
                type="checkbox"
                checked={isFilterEnabled}
                onChange={(e) => setIsFilterEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>Enable Background Filter</span>
            </label>
          </div>

          {isFilterEnabled && (
            <>
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px'
              }}>
                {['grayscale', 'sepia', 'blur'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterType(filter)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: filterType === filter ? '2px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: filterType === filter ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: '#fff',
                      transition: 'all 0.3s',
                      textTransform: 'capitalize',
                      fontSize: '0.9em',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Timeline Controls */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '25px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{
            marginBottom: '15px',
            fontSize: '1.1em',
            color: '#fff',
            fontWeight: '300',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>Timeline</h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              fontSize: '1em',
              color: '#ccc'
            }}>
              <input
                type="checkbox"
                checked={timelineMode}
                onChange={(e) => setTimelineMode(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>Apply filter during timeframe</span>
            </label>
          </div>

          {timelineMode && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  color: '#aaa',
                  fontSize: '0.85em',
                  display: 'block',
                  marginBottom: '8px',
                  letterSpacing: '0.5px'
                }}>
                  Start: {startTime.toFixed(1)}s
                </label>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="0.5"
                  value={startTime}
                  onChange={(e) => setStartTime(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    accentColor: '#fff'
                  }}
                />
              </div>
              <div>
                <label style={{
                  color: '#aaa',
                  fontSize: '0.85em',
                  display: 'block',
                  marginBottom: '8px',
                  letterSpacing: '0.5px'
                }}>
                  End: {endTime.toFixed(1)}s
                </label>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="0.5"
                  value={endTime}
                  onChange={(e) => setEndTime(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    accentColor: '#fff'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App; 