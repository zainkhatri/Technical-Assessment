import React, { useRef, useState } from 'react';
import VideoPlayer from './components/VideoPlayer';
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
  const videoRef = useRef<HTMLVideoElement>(null);
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
      <div style={{ textAlign: 'center' }}>
        <div className="video-container">
          <VideoPlayer
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={() => console.log('Video loaded')}
          />
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={pingBackend}
            className="btn btn-primary"
          >
            Ping Backend
          </button>
          {response && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              Response: {response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App; 