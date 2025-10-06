import logging
import ffmpeg
import os
import uuid
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
import base64
from rembg import remove, new_session

# A lightweight face detection model
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Initialize rembg session for background removal
# Using u2net_human_seg model which is optimized for human segmentation
session = new_session("u2net_human_seg")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_temp_path():
    temp_dir = os.path.join(os.path.dirname(__file__), "temp")
    os.makedirs(temp_dir, exist_ok=True)
    random_filename = f"temp_{str(uuid.uuid4())[:8]}"
    return os.path.join(temp_dir, random_filename)

def process_frame_with_background_filter(image_data, filter_type='grayscale'):
    """
    Process a video frame to apply filter to background while keeping person in color

    Args:
        image_data: base64 encoded image or numpy array
        filter_type: Type of filter to apply ('grayscale', 'sepia', 'blur')

    Returns:
        base64 encoded processed image
    """
    try:
        # Decode image if it's base64
        if isinstance(image_data, str):
            # Remove data URL prefix if present
            if 'base64,' in image_data:
                image_data = image_data.split('base64,')[1]

            img_bytes = base64.b64decode(image_data)
            img_pil = Image.open(BytesIO(img_bytes))
        else:
            frame = image_data
            img_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

        # Resize image for faster processing (max 480px width)
        max_width = 480
        if img_pil.width > max_width:
            ratio = max_width / img_pil.width
            new_height = int(img_pil.height * ratio)
            img_pil = img_pil.resize((max_width, new_height), Image.LANCZOS)

        # Convert PIL image to numpy array for processing
        frame = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

        # Use rembg to get the foreground (person) with alpha channel
        # This returns an image with transparent background
        output_with_alpha = remove(img_pil, session=session)

        # Extract the alpha channel as the mask
        output_array = np.array(output_with_alpha)
        if output_array.shape[2] == 4:  # RGBA
            # Extract alpha channel and normalize to 0-1
            mask = output_array[:, :, 3].astype(np.float32) / 255.0
            # Smooth the mask for better blending (reduced kernel for speed)
            mask = cv2.GaussianBlur(mask, (7, 7), 0)
            # Ensure mask is between 0 and 1
            mask = np.clip(mask, 0, 1)
        else:
            # If no alpha channel, create a full mask
            mask = np.ones((frame.shape[0], frame.shape[1]), dtype=np.float32)

        # Expand mask to 3 channels
        mask_3channel = np.stack([mask] * 3, axis=-1)

        # Apply filter to background
        if filter_type == 'grayscale':
            # Convert background to grayscale
            gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray_frame_3channel = cv2.cvtColor(gray_frame, cv2.COLOR_GRAY2BGR)
            background = gray_frame_3channel
        elif filter_type == 'sepia':
            # Apply sepia filter
            kernel = np.array([[0.272, 0.534, 0.131],
                             [0.349, 0.686, 0.168],
                             [0.393, 0.769, 0.189]])
            background = cv2.transform(frame, kernel)
            background = np.clip(background, 0, 255).astype(np.uint8)
        elif filter_type == 'blur':
            # Apply blur (reduced kernel for speed)
            background = cv2.GaussianBlur(frame, (15, 15), 0)
        else:
            background = frame

        # Combine person (original) with filtered background
        output = (frame * mask_3channel + background * (1 - mask_3channel)).astype(np.uint8)

        # Convert back to RGB for encoding
        output_rgb = cv2.cvtColor(output, cv2.COLOR_BGR2RGB)

        # Encode to base64 (lower quality for speed)
        img_pil_output = Image.fromarray(output_rgb)
        buffer = BytesIO()
        img_pil_output.save(buffer, format='JPEG', quality=70)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        return f"data:image/jpeg;base64,{img_base64}"

    except Exception as e:
        logger.error(f"Error processing frame: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise