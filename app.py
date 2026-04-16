import os
import json
import time
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_cors import CORS

app = Flask(__name__)

CORS(app)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

app.secret_key = os.environ.get("SECRET_KEY", "clave_ultra_secreta_123")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

@app.route("/")
def index():
    return "Servidor de Auditoría IA activo y funcionando."

@app.route("/api/analyze_batch", methods=["POST"])
def analyze_batch():
    if not GEMINI_API_KEY:
        return jsonify({"error": "Falta la API KEY de Gemini en el servidor"}), 500

    datos = request.json
    tweets = datos.get("tweets", [])
    temas = datos.get("temas", [])

    if not tweets:
        return jsonify({"ids_polemicos": []})

    modelo = genai.GenerativeModel("gemini-1.5-flash")
    
    lista_tweets = "\n".join([f'ID:"{tw["id"]}" | TEXTO: {tw["texto"]}' for tw in tweets])
    criterio = f"contenido relacionado con: {', '.join(temas)}" if temas else "contenido ofensivo, tóxico o polémico"

    prompt = f"""Analiza esta lista de tweets y decide cuáles cumplen este criterio: {criterio}.
    Responde ÚNICAMENTE con un array de JSON que contenga los IDs de los tweets detectados.
    Ejemplo de respuesta: ["12345", "67890"]
    Si no encuentras ninguno, responde: []
    No escribas NADA de texto adicional, solo el array de IDs.
    
    Tweets:
    {lista_tweets}"""

    try:
        respuesta = modelo.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
        )
        
        texto_limpio = respuesta.text.strip().replace('```json', '').replace('```', '').strip()
        ids_detectados = json.loads(texto_limpio)
        
        return jsonify({"ids_polemicos": ids_detectados, "error": None})
    
    except Exception as e:
        print(f"Error en Gemini: {e}")
        return jsonify({"error": str(e), "ids_polemicos": []}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
