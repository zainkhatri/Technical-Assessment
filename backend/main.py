from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging
from helpers import *

app = Flask(__name__)
cors = CORS(app)
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route("/hello-world", methods=["GET"])
def hello_world():
    try:
        return jsonify({"Hello": "World"}), 200
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/process-frame", methods=["POST"])
def process_frame():
    """
    Apply background filter to video frame while keeping person in color
    Request body: { "image": "base64_string", "filter": "grayscale|sepia|blur" }
    Response: { "processedImage": "base64_string", "filter": "grayscale" }
    """
    try:
        data = request.get_json()

        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400

        image_data = data['image']
        filter_type = data.get('filter', 'grayscale')

        logger.info(f"Processing frame with filter: {filter_type}")

        processed_image = process_frame_with_background_filter(image_data, filter_type)

        return jsonify({
            "processedImage": processed_image,
            "filter": filter_type
        }), 200

    except Exception as e:
        logger.error(f"Error processing frame: {e}")
        return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080, debug=True, use_reloader=False)
