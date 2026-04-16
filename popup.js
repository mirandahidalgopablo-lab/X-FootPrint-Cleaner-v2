const RENDER_URL = "https://x-footprint-cleaner-v2.onrender.com/api/analyze_batch";

document.getElementById('btnStart').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const logBox = document.getElementById('log');
    
    if (!fileInput.files.length) {
        alert("Selecciona el archivo tweets.js");
        return;
    }

    const log = (m, color = "#00ff00") => {
        logBox.innerHTML += `<div style="color: ${color}">> ${m}</div>`;
        logBox.scrollTop = logBox.scrollHeight;
    };

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        let text = e.target.result.trim();
        log("Leyendo historial...");

        if (text.startsWith("window.YTD")) text = text.substring(text.indexOf('['));
        
        let tweets = [];
        try {
            const matches = text.matchAll(/\{[\s\S]*?\}\s*(?=,|\s*\])/g);
            for (const match of matches) {
                try {
                    const obj = JSON.parse(match[0]);
                    const t = obj.tweet || obj;
                    if (t.full_text || t.text) {
                        tweets.push({ 
                            id: t.id_str || t.id, 
                            texto: t.full_text || t.text 
                        });
                    }
                } catch (err) {}
            }
            log(`✅ ${tweets.length} tweets listos.`);
        } catch (err) { log("Error procesando archivo", "red"); return; }

        const temas = Array.from(document.querySelectorAll('input[name="temas"]:checked')).map(c => c.value);
        const LOTE = 100;

        for (let i = 0; i < tweets.length; i += LOTE) {
            const lote = tweets.slice(i, i + LOTE);
            log(`Analizando bloque ${Math.floor(i/LOTE)+1}...`, "#1d9bf0");
            
            try {
                const res = await fetch(RENDER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tweets: lote, temas: temas })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                
                const data = await res.json();
                
                if (data.ids_polemicos && data.ids_polemicos.length > 0) {
                    log(`! IA detectó ${data.ids_polemicos.length} tweets`, "yellow");
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "borrar", ids: data.ids_polemicos });
                    });
                }
            } catch (err) { 
                log(`Error conexión: ${err.message}`, "red");
                log("Reintentando en 5s...");
                await new Promise(r => setTimeout(r, 5000));
                i -= LOTE;
            }
            await new Promise(r => setTimeout(r, 8000));
        }
        log("=== ANÁLISIS FINALIZADO ===", "#1d9bf0");
    };
    reader.readAsText(file);
});
