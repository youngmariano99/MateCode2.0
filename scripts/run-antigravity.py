import sys
import json
import time
import os
from google import genai
from google.genai import types

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "logs": "Missing prompt argument."}))
        sys.exit(1)
        
    prompt = sys.argv[1]
    
    system_instructions = "Eres un desarrollador experto. Usa las herramientas a tu disposición para ejecutar la tarea. Debes devolver la salida JSON en el formato requerido por el usuario (handoff)."
    if len(sys.argv) >= 3:
        system_instructions = sys.argv[2]
        
    start_time = time.time()
    
    try:
        # Require GEMINI_API_KEY in the environment
        if not os.environ.get("GEMINI_API_KEY"):
            raise ValueError("GEMINI_API_KEY environment variable is not set.")

        client = genai.Client()
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instructions,
            )
        )
        
        full_text = response.text
            
        end_time = time.time()
        duration_s = round(end_time - start_time, 2)
        
        tokens_in = 0
        tokens_out = 0
        if response.usage_metadata:
            tokens_in = getattr(response.usage_metadata, 'prompt_token_count', 0)
            tokens_out = getattr(response.usage_metadata, 'candidates_token_count', 0)
            
        output = {
            "success": True,
            "text": full_text,
            "metrics": {
                "duration_seconds": duration_s,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out
            }
        }
        
        print(json.dumps(output))
            
    except Exception as e:
        end_time = time.time()
        print(json.dumps({
            "success": False,
            "logs": str(e),
            "metrics": {
                "duration_seconds": round(end_time - start_time, 2)
            }
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()

