# Background Filter

Apply visual effects to video backgrounds while keeping people in full color. Runs entirely in your browser.

## Quick Start

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

## What It Does

Detects people in videos and applies filters only to the background. Person stays in color, everything behind gets the effect.

**Features**
* Grayscale, sepia, and blur filters
* Timeline mode to apply filters during specific time ranges
* Upload any video from your device
* Toggle filters on/off
* Real time FPS counter

## How to Use

1. Click play on the demo video
2. Pick a filter
3. Upload your own video
4. Toggle filters on/off
5. Use timeline mode to apply filters at specific times

## How It Works

MediaPipe separates person from background in real time. Filter gets applied to the whole frame, then the person is cut out and layered on top. Runs at 20-30 FPS.

## Tech Stack

* React + TypeScript
* MediaPipe Selfie Segmentation
* HTML5 Canvas API
* requestAnimationFrame for rendering

## Project Structure

```
frontend/
  src/
    App.tsx                      # Main UI and controls
    components/
      FilteredVideoPlayer.tsx    # Video processing

backend/
  main.py                        # Flask server (optional)
  helpers.py                     # Image processing
```

## Browser Compatibility

Works on Chrome, Firefox, Safari, Edge. Requires ES6+, HTML5 Canvas, and WebAssembly.

MediaPipe models (~6MB) download from CDN on first load, then cache locally.
