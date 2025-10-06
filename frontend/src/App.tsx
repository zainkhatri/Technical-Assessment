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
  const [filterType, setFilterType] = useState<string>('grayscale');
  const [isFilterEnabled, setIsFilterEnabled] = useState<boolean>(true);
  const [response, setResponse] = useState<string>('');

  const pingBackend = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8080/hello-world');
      const data = await res.text();
      setResponse(data);
      console.log('Backend response:', data);
    } catch (error) {
      console.error('Error pinging backend:', error);
      setResponse('Error connecting to backend');
    }
  };

  return (
    <div className="container">
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h1 style={{ marginBottom: '10px', fontSize: '2.5em', fontWeight: 'bold' }}>
          Video Background Filter
        </h1>
        <p style={{ marginBottom: '30px', color: '#666', fontSize: '1.1em' }}>
          Keep the speaker in color while filtering the background
        </p>

        <div className="video-container" style={{ marginBottom: '30px' }}>
          <FilteredVideoPlayer
            src={videoUrl}
            filterType={filterType}
            isFilterEnabled={isFilterEnabled}
          />
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          {/* Filter Controls */}
          <div style={{
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            width: '100%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1.2em' }}>Filter Controls</h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '1.1em'
              }}>
                <input
                  type="checkbox"
                  checked={isFilterEnabled}
                  onChange={(e) => setIsFilterEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span>Enable Background Filter</span>
              </label>
            </div>

            {isFilterEnabled && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: 'bold'
                }}>
                  Filter Type:
                </label>
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  {['grayscale', 'sepia', 'blur'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setFilterType(filter)}
                      className={`btn ${filterType === filter ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: filterType === filter ? 'bold' : 'normal',
                        background: filterType === filter ? '#007bff' : '#6c757d',
                        color: 'white',
                        transition: 'all 0.2s',
                        textTransform: 'capitalize'
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Backend Test */}
          <div style={{
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            width: '100%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1.2em' }}>Backend Connection</h3>
            <button
              onClick={pingBackend}
              className="btn btn-primary"
              style={{
                padding: '10px 20px',
                background: '#28a745',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Test Backend Connection
            </button>
            {response && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#e7f3ff',
                borderRadius: '4px',
                border: '1px solid #b3d9ff'
              }}>
                <strong>Response:</strong> {response}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 