# app.py
import flask
from flask import Flask, request, jsonify
from flask_cors import CORS 
import google.generativeai as genai
import google.api_core.exceptions 
import os
import mimetypes 
import base64 
from dotenv import load_dotenv 

# Load environment variables from .env file
load_dotenv() 

# --- Configuration ---
try:
    GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
except KeyError:
    print("🔴 GEMINI_API_KEY not found in environment variables or .env file.")
    print("Please ensure it's set correctly in your .env file.")
    exit() 

genai.configure(api_key=GEMINI_API_KEY)

# Initialize the Flask app
app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Helper Function to Parse Data URL ---
def parse_data_url(data_url_string):
    """
    Parses a data URL string (e.g., "data:image/png;base64,iVBORw0KGgo...")
    into its MIME type and base64 data.
    Returns: (mime_type, base64_data) or (None, None) if parsing fails.
    """
    try:
        header, encoded_data = data_url_string.split(',', 1)
        mime_type = header.split(';')[0].split(':')[1]
        return mime_type, encoded_data
    except Exception as e:
        app.logger.error(f"Error parsing data URL: {e}")
        return None, None

# --- API Endpoint for Image Generation ---
@app.route('/generate-image', methods=['POST'])
def generate_image_route():
    if not request.is_json:
        app.logger.warn("Request is not JSON")
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    text_prompt_from_user = data.get('prompt', '').strip()
    sketch_data_url = data.get('sketch') 

    app.logger.info(f"Received request: original_prompt='{text_prompt_from_user}', sketch_present={bool(sketch_data_url)}")

    if not text_prompt_from_user and not sketch_data_url:
        return jsonify({"error": "Please provide a text prompt or a sketch."}), 400

    prompt_parts = [] 
    
    final_text_prompt = ""
    if text_prompt_from_user:
        prompt_lower = text_prompt_from_user.lower()
        is_explicit_image_request = any(phrase in prompt_lower for phrase in [
            "generate an image", "create an image", "draw an image", "make an image", 
            "show me an image", "sketch an image", "generate a picture", "create a picture", 
            "draw a picture", "make a picture", "show me a picture", "sketch a picture",
            "illustrate", "visualize"
        ])
        if not is_explicit_image_request:
            final_text_prompt = f"Generate an image of: {text_prompt_from_user}"
        else:
            final_text_prompt = text_prompt_from_user
        
        if not any(desc_phrase in prompt_lower for desc_phrase in ["description", "describe", "caption", "tell me about it"]):
            final_text_prompt += ". Also, provide a short text description of the image."

    elif sketch_data_url: 
        final_text_prompt = "Generate an image from the provided sketch and provide a short text description."
    
    if not final_text_prompt and not sketch_data_url: 
        app.logger.error("Logic error: No text prompt could be constructed and no sketch provided.")
        return jsonify({"error": "Internal error preparing prompt. No text or sketch content."}), 500
        
    if final_text_prompt: 
        prompt_parts.append(final_text_prompt)
        app.logger.info(f"Final text prompt for API: '{final_text_prompt}'")

    if sketch_data_url:
        mime_type, base64_sketch_data_str = parse_data_url(sketch_data_url)
        if mime_type and base64_sketch_data_str:
            supported_image_types = ["image/png", "image/jpeg", "image/webp"]
            if mime_type not in supported_image_types:
                app.logger.error(f"Unsupported sketch image MIME type: {mime_type}")
                return jsonify({"error": f"Unsupported sketch image MIME type: {mime_type}. Supported: {', '.join(supported_image_types)}"}), 400
            
            prompt_parts.append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": base64_sketch_data_str 
                }
            })
            app.logger.info(f"Added sketch with MIME type: {mime_type} to prompt_parts")
        else: 
            app.logger.error("Invalid sketch data format for API. Expected a valid data URL.")
            return jsonify({"error": "Invalid sketch data format. Expected a valid data URL."}), 400
    
    if not prompt_parts: 
        app.logger.error("No valid content parts to send to API after processing inputs (prompt_parts is empty).")
        return jsonify({"error": "No valid content to send to API."}), 400

    try:
        model = genai.GenerativeModel(model_name="gemini-2.0-flash-preview-image-generation")
        
        # Use the successful generation_config dictionary pattern
        generation_config_dict = {
            "response_mime_type": "text/plain", 
            "response_modalities": ["IMAGE", "TEXT"] 
        }
        app.logger.info(f"Sending content to Gemini. Number of parts: {len(prompt_parts)}. Content: {prompt_parts}. Config: {generation_config_dict}")

        response = model.generate_content(
            contents=prompt_parts, 
            generation_config=generation_config_dict 
        ) 
        
        generated_image_data_url = None
        generated_text_description = None 

        if response.parts:
            for part in response.parts:
                if hasattr(part, 'inline_data') and part.inline_data and part.inline_data.data:
                    img_base64_data_from_sdk = part.inline_data.data # Data from SDK part
                    mime_type = part.inline_data.mime_type

                    # Ensure img_base64_data_from_sdk is a clean base64 string for the data URL
                    final_base64_str = None
                    if isinstance(img_base64_data_from_sdk, bytes):
                        # If the SDK gives raw bytes, encode it to base64, then decode to a utf-8 string
                        final_base64_str = base64.b64encode(img_base64_data_from_sdk).decode('utf-8')
                    elif isinstance(img_base64_data_from_sdk, str):
                        # If it's already a string, assume it's the correct base64 payload.
                        # (The b'...' issue should be less likely if SDK returns bytes or a clean string directly from API)
                        final_base64_str = img_base64_data_from_sdk
                    else:
                        app.logger.error(f"Unexpected image data type from SDK part: {type(img_base64_data_from_sdk)}")
                        continue # Skip this part if data type is not recognized
                    
                    if final_base64_str:
                        generated_image_data_url = f"data:{mime_type};base64,{final_base64_str}"
                        app.logger.info(f"Successfully extracted and formatted generated image: {mime_type}")
                elif hasattr(part, 'text') and part.text:
                    generated_text_description = part.text
                    app.logger.info(f"Received text part from Gemini: {generated_text_description}")

        if generated_image_data_url:
            return jsonify({"imageUrl": generated_image_data_url, "description": generated_text_description or ""})
        else:
            error_message = "No image was generated by the API."
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback.block_reason:
                 error_message = f"Image generation blocked. Reason: {response.prompt_feedback.block_reason_message or response.prompt_feedback.block_reason}"
                 app.logger.warn(error_message)
            elif hasattr(response, 'candidates') and response.candidates and response.candidates[0].finish_reason != 'STOP':
                 error_message = f"Image generation did not complete successfully. Finish Reason: {response.candidates[0].finish_reason}"
                 app.logger.warn(error_message)
            else:
                response_text_for_log = generated_text_description or "N/A (no text part)"
                if not generated_text_description: 
                    try:
                        response_text_for_log = response.text 
                    except Exception:
                        pass
                app.logger.warn(f"No image data found in response. Text content (if any): {response_text_for_log}")
            return jsonify({"error": error_message, "description": generated_text_description or ""}), 500

    except google.api_core.exceptions.InvalidArgument as e: 
        app.logger.error(f"InvalidArgument Error from Gemini API: {e}", exc_info=True)
        return jsonify({"error": f"AI service error (InvalidArgument): {str(e)}"}), 500 
    except TypeError as e: 
        app.logger.error(f"TypeError: {e}", exc_info=True) # Catching general TypeErrors too
        return jsonify({"error": f"Internal server error (TypeError): {str(e)}"}), 500
    except Exception as e:
        app.logger.error(f"General error calling Gemini API or processing response: {e}", exc_info=True)
        error_detail = str(e)
        if hasattr(e, 'message') and isinstance(getattr(e, 'message'), str): 
            error_detail = e.message
        return jsonify({"error": f"An error occurred with the AI service: {error_detail}"}), 500

# --- Main execution ---
if __name__ == '__main__':
    print("Flask server starting on http://127.0.0.1:5000")
    print("Ensure your GEMINI_API_KEY environment variable is set (e.g., in a .env file).")
    app.run(host='0.0.0.0', port=5000, debug=True)
