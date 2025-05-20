# app.py
import flask
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
import google.api_core.exceptions
import os
import mimetypes
import base64
from dotenv import load_dotenv
import json 

load_dotenv()

try:
    GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
except KeyError:
    print("🔴 GEMINI_API_KEY not found in environment variables or .env file.")
    print("Please ensure it's set correctly in your .env file.")
    exit()

genai.configure(api_key=GEMINI_API_KEY)

app = Flask(__name__, static_folder='public')
CORS(app)

@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)

@app.route('/')
def serve_root():
    return "Hello! Try accessing /python_image_tester.html"

def parse_data_url(data_url_string):
    try:
        header, encoded_data = data_url_string.split(',', 1)
        mime_type = header.split(';')[0].split(':')[1]
        return mime_type, encoded_data
    except Exception as e:
        app.logger.error(f"Error parsing data URL: {e}")
        return None, None

@app.route('/generate-image', methods=['POST'])
def generate_image_route():
    if not request.is_json:
        app.logger.warning("Request is not JSON")
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    text_prompt_from_user = data.get('prompt', '').strip()
    sketch_data_url = data.get('sketch')

    app.logger.info(f"Received request: original_prompt='{text_prompt_from_user}', sketch_present={bool(sketch_data_url)}")

    if not text_prompt_from_user and not sketch_data_url:
        return jsonify({"error": "Please provide a text prompt or a sketch."}), 400

    prompt_parts = []
    if text_prompt_from_user:
        final_text_prompt = f"Generate an image of: {text_prompt_from_user}"
        prompt_parts.append(final_text_prompt)
        app.logger.info(f"Added text prompt for API: '{final_text_prompt}'")
    
    if sketch_data_url:
        mime_type, base64_sketch_data_str = parse_data_url(sketch_data_url)
        if mime_type and base64_sketch_data_str:
            supported_image_types = ["image/png", "image/jpeg", "image/webp"]
            if mime_type not in supported_image_types:
                app.logger.error(f"Unsupported sketch image MIME type: {mime_type}")
                return jsonify({"error": f"Unsupported sketch image MIME type: {mime_type}. Supported: {', '.join(supported_image_types)}"}), 400
            prompt_parts.append({"inline_data": {"mime_type": mime_type, "data": base64_sketch_data_str}})
            app.logger.info(f"Added sketch with MIME type: {mime_type} to prompt_parts")
            if not text_prompt_from_user: 
                prompt_parts.insert(0, "Generate an image from the provided sketch.")
                app.logger.info("Added generic text prompt for sketch-only image generation.")
        else:
            app.logger.error("Invalid sketch data format for API. Expected a valid data URL.")
            return jsonify({"error": "Invalid sketch data format. Expected a valid data URL."}), 400

    if not prompt_parts:
        app.logger.error("No valid content parts to send to API (prompt_parts is empty after processing inputs).")
        return jsonify({"error": "No valid content to send to API."}), 400

    # Using your provided try-except block for the API call and response parsing
    try:
        model = genai.GenerativeModel(model_name="gemini-2.0-flash-preview-image-generation")
        
        generation_config_dict = {
            "response_mime_type": "text/plain", # As per your snippet
            "response_modalities": ["IMAGE", "TEXT"] # As per your snippet
        }
        app.logger.info(f"Sending content to Gemini. Number of parts: {len(prompt_parts)}. Content: {prompt_parts}. Config: {generation_config_dict}")

        response = model.generate_content(
            contents=prompt_parts, 
            generation_config=generation_config_dict 
        ) 
        
        generated_image_data_url = None
        generated_text_description = None 

        # Using your parsing logic from the snippet
        if response.parts:
            app.logger.info(f"Gemini response has {len(response.parts)} parts.")
            for part in response.parts:
                if hasattr(part, 'inline_data') and part.inline_data and part.inline_data.data:
                    img_base64_data_from_sdk = part.inline_data.data
                    mime_type = part.inline_data.mime_type
                    final_base64_str = None
                    if isinstance(img_base64_data_from_sdk, bytes):
                        final_base64_str = base64.b64encode(img_base64_data_from_sdk).decode('utf-8')
                    elif isinstance(img_base64_data_from_sdk, str):
                        final_base64_str = img_base64_data_from_sdk
                    else:
                        app.logger.error(f"Unexpected image data type from SDK part: {type(img_base64_data_from_sdk)}")
                        continue
                    
                    if final_base64_str:
                        generated_image_data_url = f"data:{mime_type};base64,{final_base64_str}"
                        app.logger.info(f"Successfully extracted and formatted generated image: {mime_type}")
                elif hasattr(part, 'text') and part.text:
                    generated_text_description = part.text # Simpler assignment from your snippet
                    app.logger.info(f"Received text part from Gemini: {generated_text_description[:100]}...")
        else:
            app.logger.warning("Gemini response did not have the expected 'parts' attribute or it was empty.")
            if hasattr(response, 'text') and response.text: # Fallback if only text is present
                 generated_text_description = response.text
                 app.logger.info(f"Response had no parts, but had text: {generated_text_description[:100]}...")

        if generated_image_data_url:
            return jsonify({"imageUrl": generated_image_data_url, "description": generated_text_description or ""})
        else:
            error_message = "No image data was generated or found in the AI service response."
            # Using finish_reason logic from your snippet
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback.block_reason:
                 error_message = f"Image generation blocked. Reason: {response.prompt_feedback.block_reason_message or response.prompt_feedback.block_reason}"
                 app.logger.warning(error_message)
            elif hasattr(response, 'candidates') and response.candidates and hasattr(response.candidates[0], 'finish_reason') and response.candidates[0].finish_reason.name != 'STOP':
                 error_message = f"Image generation did not complete successfully. Finish Reason: {response.candidates[0].finish_reason.name}"
                 app.logger.warning(error_message)
            else:
                response_text_for_log = generated_text_description or "N/A (no text part)"
                if not generated_text_description and hasattr(response, 'text'): 
                    response_text_for_log = response.text 
                app.logger.warning(f"No image data found in response. Text content (if any): {response_text_for_log[:500]}...")
            return jsonify({"error": error_message, "description": generated_text_description or ""}), 500

    except google.api_core.exceptions.InvalidArgument as e: 
        app.logger.error(f"InvalidArgument Error from Gemini API: {e}", exc_info=True)
        return jsonify({"error": f"AI service error (InvalidArgument): {str(e)}"}), 400 # Kept 400 for InvalidArgument
    except TypeError as e: 
        app.logger.error(f"TypeError: {e}", exc_info=True)
        return jsonify({"error": f"Internal server error (TypeError): {str(e)}"}), 500
    except Exception as e:
        app.logger.error(f"General error calling Gemini API or processing response: {e}", exc_info=True)
        error_detail = str(e)
        if hasattr(e, 'message') and isinstance(getattr(e, 'message'), str): 
            error_detail = e.message
        return jsonify({"error": f"An error occurred with the AI service: {error_detail}"}), 500

if __name__ == '__main__':
    print("Flask server starting on http://127.0.0.1:5000")
    print("To test the image generation, open http://127.0.0.1:5000/python_image_tester.html in your browser.")
    print("Ensure your GEMINI_API_KEY environment variable is set (e.g., in a .env file).")
    print("Ensure Python dependencies are installed: pip install Flask Flask-CORS google-generativeai python-dotenv")
    app.run(host='0.0.0.0', port=5000, debug=True)
