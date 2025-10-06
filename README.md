# Video Background Filter - Technical Assessment

A full-stack application that applies real-time background filters to video while keeping the speaker in full color. Built with Flask (Python) and React (TypeScript).

## Project Structure

This repository contains two main components:

### Backend (`/backend`)
- **Technology**: Python Flask with rembg (U2Net segmentation)
- **Purpose**: Real-time person segmentation and background filtering
- **Key Files**:
  - `main.py` - Flask API with `/process-frame` endpoint
  - `helpers.py` - Core image processing and segmentation logic
  - `requirements.txt` - Python dependencies

### Frontend (`/frontend`)
- **Technology**: React with TypeScript + HTML5 Canvas
- **Purpose**: Real-time video filtering interface with canvas-based frame processing
- **Key Files**:
  - `src/App.tsx` - Main application with filter controls
  - `src/components/FilteredVideoPlayer.tsx` - Canvas-based video processor
  - `src/consts.ts` - Configuration constants (video URL)

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the project root directory
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   python backend/main.py
   ```

The backend will run on `http://127.0.0.1:8080`

**Note:** On first run, the backend will download the U2Net human segmentation model (~176MB). This is cached for future use.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

The frontend will run on `http://localhost:3000`

## Features

✅ **Core Functionality**
- Real-time person segmentation using U2Net model
- Background filtering while keeping person in color
- Multiple filter options: Grayscale, Sepia, Blur
- Smooth mask blending for natural edges

✅ **User Experience**
- Toggle filters on/off
- Real-time filter switching
- FPS performance counter
- Clean, responsive UI
- Backend connection testing

## API Endpoints

### Backend Routes
- `POST /process-frame` - Process video frame with background filter
- `GET /hello-world` - Health check endpoint

## Usage

1. Start both the backend and frontend servers (see setup instructions above)
2. Open your browser to `http://localhost:3000`
3. The video will load with background filter already applied
4. Use the controls to:
   - Toggle filter on/off
   - Switch between filter types (Grayscale, Sepia, Blur)
   - Monitor processing FPS
   - Test backend connection

## Technical Implementation

### Backend Architecture
- **Person Segmentation**: Uses rembg with U2Net human segmentation model
- **Image Processing**: OpenCV for filter application and mask blending
- **API**: Flask REST endpoint accepting base64 encoded frames
- **Filters**: Grayscale, sepia tone, and Gaussian blur

### Frontend Architecture
- **Frame Capture**: HTML5 Canvas captures video frames
- **Processing Pipeline**: Frames → Base64 → Backend → Processed Frame → Canvas
- **Real-time Rendering**: requestAnimationFrame for smooth playback
- **Performance Monitoring**: FPS counter tracks processing speed

### Configuration
- Video source: `frontend/src/consts.ts`
- Backend port: 8080 (configurable in `backend/main.py`)
- Frontend port: 3000 (React default)

## Technologies Used

- **Backend**: Python, Flask, rembg (U2Net), OpenCV, NumPy, Pillow
- **Frontend**: React, TypeScript, HTML5 Canvas, Fetch API
- **ML Model**: U2Net Human Segmentation (176MB, auto-downloaded)
- **Development**: Hot reload enabled for both frontend and backend

## Documentation

- **SETUP.md** - Detailed setup and troubleshooting guide
- **IMPLEMENTATION.md** - Technical deep-dive and architecture details
- **README.md** - This file (quick start guide)

## Performance

- **Typical FPS**: 10-15 FPS (depends on hardware and video resolution)
- **Processing Time**: ~100ms per frame
- **Model Size**: 176MB (cached locally after first download)
- **Network Latency**: Depends on local setup (typically <10ms)

## Known Limitations

- Processing speed limited by real-time segmentation
- Best results with clear person visibility
- Performance varies by video resolution
- Requires stable internet for initial model download

## Future Enhancements

Potential improvements for production use:
- Client-side segmentation (WebAssembly/TensorFlow.js)
- WebGL-accelerated rendering
- WebRTC for lower latency
- Batch processing optimization
- GPU acceleration
- Video export functionality
- Custom filter creation
- Timeline-based filter controls

## License

This project is designed for technical assessment purposes.