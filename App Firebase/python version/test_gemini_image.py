import google.generativeai as genai
# from google.genai import types # Not strictly needed if passing generation_config as dict
import google.api_core.exceptions 
import os
from dotenv import load_dotenv
from PIL import Image 
import io
import base64 

# Load environment variables from .env file
load_dotenv()

# --- API Key Setup ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("🔴 GEMINI_API_KEY not found in environment variables or .env file.")
    print("Please ensure it's set correctly in your .env file.")
    exit()

try:
    genai.configure(api_key=GEMINI_API_KEY)
    print("API Key configured successfully for genai module.")
except Exception as e:
    print(f"🔴 Error configuring API key with genai.configure: {e}")
    exit()


def test_image_generation(prompt_text, test_name="Test"):
    """
    Tests generating an image and text from a text prompt,
    passing generation_config as a dictionary including response_modalities.
    """
    print(f"\n--- {test_name} ---")
    print(f"Attempting to generate for prompt: '{prompt_text}'")
    try:
        model = genai.GenerativeModel(model_name="gemini-2.0-flash-preview-image-generation")
        print("genai.GenerativeModel initialized.")
        
        # For a text-only prompt, contents is a list with the string.
        # If adding an image later, it would be [text_string, image_part_dict_or_pil]
        contents_for_api = [prompt_text] 
        
        print(f"Sending to API. Contents: {contents_for_api}")

        # MODIFICATION: Pass generation_config parameters as a dictionary,
        # attempting to include response_modalities.
        # The values for response_modalities should be uppercase as per typical API specs.
        generation_config_dict = {
            "response_mime_type": "text/plain", # For the text part
            "response_modalities": ["IMAGE", "TEXT"] # Attempting to set this
            # Other potential config params: "temperature": 0.7, "candidate_count": 1
        }
        
        print(f"Generation Config (as dict): {generation_config_dict}")

        response = model.generate_content(
            contents=contents_for_api, 
            generation_config=generation_config_dict # Pass the dictionary directly
        )

        image_generated = False
        text_part_received = None 

        if hasattr(response, 'parts') and response.parts:
            print(f"Response has {len(response.parts)} part(s).")
            for i, part in enumerate(response.parts):
                print(f"  Part {i}:")
                if hasattr(part, 'text') and part.text:
                    text_part_received = part.text
                    print(f"    Text received: {text_part_received}")
                if hasattr(part, 'inline_data') and part.inline_data and part.inline_data.data:
                    print(f"    Inline Data (Image) found. Mime-type: {part.inline_data.mime_type}")
                    try:
                        img_data_from_api = part.inline_data.data
                        image_bytes_decoded = None
                        if isinstance(img_data_from_api, str): 
                            image_bytes_decoded = base64.b64decode(img_data_from_api)
                        elif isinstance(img_data_from_api, bytes): 
                            image_bytes_decoded = img_data_from_api
                        else:
                            print(f"    Unrecognized image data type: {type(img_data_from_api)}")
                            continue

                        if image_bytes_decoded:
                            img = Image.open(io.BytesIO(image_bytes_decoded))
                            save_filename = f"generated_dict_modalities_{test_name.replace(' ', '_').replace(':', '')}.png"
                            img.save(save_filename)
                            print(f"    Image part successfully processed and saved as {save_filename}")
                            image_generated = True
                    except Exception as img_e:
                        print(f"    Error processing image part: {img_e}")
        else:
            print("Response has no parts or 'parts' attribute is missing/empty.")
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback.block_reason:
                 print(f"   Prompt Feedback Block Reason: {response.prompt_feedback.block_reason_message or response.prompt_feedback.block_reason}")

        if image_generated:
            print(f"\n✅ Image generation successful for '{test_name}'!")
            if text_part_received:
                print(f"ℹ️  A text part was also received: '{text_part_received}'")
        else:
            print(f"\n⚠️ No image part found or processed in the response for '{test_name}'.")
            if text_part_received: 
                 print(f"ℹ️  However, a text part was received: '{text_part_received}'")

        if not image_generated: 
            print(f"🔴 Image generation failed for '{test_name}'.")
            if hasattr(response, 'candidates') and response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.finish_reason != 'STOP':
                    print(f"   Candidate Finish Reason: {candidate.finish_reason}")
                if not candidate.content or not candidate.content.parts:
                    print(f"   Candidate content or parts are missing/empty.")
            elif not (hasattr(response, 'parts') and response.parts):
                 print(f"   Response object details (raw): {response}")

    except google.api_core.exceptions.InvalidArgument as e: 
        print(f"\n❌ InvalidArgument Error from Gemini API for '{test_name}': {e}")
    except TypeError as e: # Catch TypeError if the dict keys are invalid for GenerationConfig
        print(f"\n❌ TypeError (likely with generation_config dictionary keys): {e}")
        import traceback
        traceback.print_exc()
    except AttributeError as e: 
        print(f"\n❌ AttributeError (likely with SDK types or model methods): {e}")
        import traceback
        traceback.print_exc()
    except Exception as e:
        print(f"\n❌ An unexpected error occurred for '{test_name}': {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # IMPORTANT: Use the exact prompt that worked for you in Google AI Studio.
    ai_studio_working_prompt = "Generate an image of a playful golden retriever puppy in a field of daisies. Also, provide a short text description of this image" 
    test_image_generation(ai_studio_working_prompt, test_name="AI Studio Prompt Dict Modalities")

    print("\nTrying another explicit prompt with this dict config + modalities:")
    explicit_prompt_2 = "Generate an image of a happy cat playing with a ball of yarn. Also, provide a detailed text description of the generated image."
    test_image_generation(explicit_prompt_2, test_name="Explicit Cat Dict Modalities")
