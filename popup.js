const RENDER_URL = "https://x-footprint-cleaner-v2.onrender.com/api/analyze_batch";

document.getElementById('btnStart').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const palabraBuscada = document.getElementById('palabraBuscada').value.toLowerCase();
    const logBox = document.getElementById('log');
    
    if (!fileInput.files.length) {
        alert("Selecciona el archivo");
        return;
    }

    const log = (m) => {
        logBox.innerHTML += `<div>> ${m}</div>`;
        logBox.scrollTop = logBox.scrollHeight;
    };

    const reader = new FileReader();
    reader.onload = async (e) => {
        let text = e.target.result.trim();
        log("PROCESANDO ARCHIVO...");

        if (text.startsWith("window.YTD")) {
            text = text.substring(text.indexOf('['));
        }
        
        let tweets = [];
        const matches = text.matchAll(/\{[\s\S]*?\}\s*(?=,|\s*\])/g);
        
        for (const match of matches) {
            try {
                const obj = JSON.parse(match[0]);
                const t = obj.tweet || obj;
                const texto = t.full_text || t.text || "";
                const id = t.id_str || t.id;

                if (palabraBuscada && texto.toLowerCase().includes(palabraBuscada)) {
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "borrar", ids: [id] });
                    });
                }

                tweets.push({ id: id, texto: texto });
            } catch (err) {}
        }

        log(`TWEETS CARGADOS: ${tweets.length}`);

        const temas = Array.from(document.querySelectorAll('input[name="temas"]:checked')).map(c => c.value);
        const LOTE = 100;

        for (let i = 0; i < tweets.length; i += LOTE) {
            const lote = tweets.slice(i, i + LOTE);
            log(`ANALIZANDO BLOQUE ${Math.floor(i/LOTE) + 1}...`);
            
            try {
                const res = await fetch(RENDER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tweets: lote, temas: temas })
                });
                
                const data = await res.json();
                
                if (data.ids_polemicos && data.ids_polemicos.length > 0) {
                    log(`DETECTADOS POR IA: ${data.ids_polemicos.length}`);
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "borrar", ids: data.ids_polemicos });
                    });
                }
            } catch (err) {
                log("ERROR DE CONEXIÓN");
            }
            await new Promise(r => setTimeout(r, 8000));
        }
        log("=== FIN DEL PROCESO ===");
    };
    reader.readAsText(fileInput.files[0]);
});
