import os
import json
from flask import Flask, request, jsonify
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

@app.route("/")
def index():
    return "Servidor Live"

@app.route("/api/analyze_batch", methods=["POST"])
def analyze_batch():
    try:
        if not GEMINI_API_KEY:
            return jsonify({"error": "Falta API Key"}), 500

        datos = request.json
        tweets = datos.get("tweets", [])
        temas = datos.get("temas", [])

        if not tweets:
            return jsonify({"ids_polemicos": []})

        modelo = genai.GenerativeModel("gemini-1.5-flash")
        
        lista_tweets = []
        for t in tweets:
            tid = t.get('id') or t.get('id_str') or "S/N"
            txt = t.get('texto') or t.get('text') or ""
            if txt:
                lista_tweets.append(f"ID:{tid} | TXT:{txt}")
        
        prompt = f"""Analiza estos tweets y busca: {', '.join(temas) if temas else 'contenido ofensivo'}.
        Responde exclusivamente con el array JSON de IDs de los tweets que coincidan. 
        Si no hay nada, responde [].
        Tweets:
        {chr(10).join(lista_tweets)}"""

        seguridad = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]

        respuesta = modelo.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
            safety_settings=seguridad
        )
        
        if not respuesta.candidates or not respuesta.candidates[0].content.parts:
            return jsonify({"ids_polemicos": [], "error": "Filtro de seguridad"}), 200

        res_text = respuesta.text.strip().replace('```json', '').replace('```', '').strip()
        return jsonify({"ids_polemicos": json.loads(res_text), "error": None})

    except Exception as e:
        print(f"🔥 ERROR DETALLADO: {str(e)}")
        return jsonify({"error": str(e), "ids_polemicos": []}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
