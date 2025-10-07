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

# Face detection classifier (not currently used but available)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Initialize U2Net model for human segmentation
session = new_session("u2net_human_seg")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_temp_path():
    temp_dir = os.path.join(os.path.dirname(__file__), "temp")
    os.makedirs(temp_dir, exist_ok=True)
    random_filename = f"temp_{str(uuid.uuid4())[:8]}"
    return os.path.join(temp_dir, random_filename)

def process_frame_with_background_filter(image_data, filter_type='grayscale'):
    """
    Apply filter to background while keeping person in color
    Uses U2Net model for higher quality segmentation than MediaPipe
    """
    try:
        # Decode base64 image
        if isinstance(image_data, str):
            if 'base64,' in image_data:
                image_data = image_data.split('base64,')[1]
            img_bytes = base64.b64decode(image_data)
            img_pil = Image.open(BytesIO(img_bytes))
        else:
            frame = image_data
            img_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

        # Resize for faster processing
        max_width = 480
        if img_pil.width > max_width:
            ratio = max_width / img_pil.width
            new_height = int(img_pil.height * ratio)
            img_pil = img_pil.resize((max_width, new_height), Image.LANCZOS)

        # Convert to numpy array
        frame = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

        # Remove background using U2Net model
        output_with_alpha = remove(img_pil, session=session)

        # Extract alpha channel as segmentation mask
        output_array = np.array(output_with_alpha)
        if output_array.shape[2] == 4:
            mask = output_array[:, :, 3].astype(np.float32) / 255.0
            mask = cv2.GaussianBlur(mask, (7, 7), 0)  # Smooth edges
            mask = np.clip(mask, 0, 1)
        else:
            mask = np.ones((frame.shape[0], frame.shape[1]), dtype=np.float32)

        # Expand mask to match RGB channels
        mask_3channel = np.stack([mask] * 3, axis=-1)

        # Apply selected filter to entire frame
        if filter_type == 'grayscale':
            gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            background = cv2.cvtColor(gray_frame, cv2.COLOR_GRAY2BGR)
        elif filter_type == 'sepia':
            kernel = np.array([[0.272, 0.534, 0.131],
                             [0.349, 0.686, 0.168],
                             [0.393, 0.769, 0.189]])
            background = cv2.transform(frame, kernel)
            background = np.clip(background, 0, 255).astype(np.uint8)
        elif filter_type == 'blur':
            background = cv2.GaussianBlur(frame, (15, 15), 0)
        else:
            background = frame

        # Composite: person in color, background filtered
        output = (frame * mask_3channel + background * (1 - mask_3channel)).astype(np.uint8)

        # Convert to RGB and encode as base64
        output_rgb = cv2.cvtColor(output, cv2.COLOR_BGR2RGB)
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