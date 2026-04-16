const RENDER_URL = "https://x-footprint-cleaner-v2.onrender.com";

document.getElementById('btnStart').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) return;

    const file = fileInput.files[0];
    const reader = new FileReader();
    const log = (m) => document.getElementById('log').innerHTML += `<div>> ${m}</div>`;

    reader.onload = async (e) => {
        let text = e.target.result.trim();
        if (text.startsWith("window.YTD")) text = text.substring(text.indexOf('['));
        
        let tweets = [];
        const matches = text.matchAll(/\{[\s\S]*?\}\s*(?=,|\s*\])/g);
        for (const match of matches) {
            try {
                const obj = JSON.parse(match[0]);
                const t = obj.tweet || obj;
                tweets.push({ id: t.id_str || t.id, texto: t.full_text || t.text });
            } catch (err) {}
        }

        const temas = Array.from(document.querySelectorAll('input[name="temas"]:checked')).map(c => c.value);
        const LOTE = 200;

        for (let i = 0; i < tweets.length; i += LOTE) {
            const lote = tweets.slice(i, i + LOTE);
            log(`Analizando bloque ${Math.floor(i/LOTE)+1}...`);
            
            try {
                const res = await fetch(RENDER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tweets: lote, temas: temas })
                });
                const data = await res.json();
                
                if (data.ids_polemicos && data.ids_polemicos.length > 0) {
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "borrar", ids: data.ids_polemicos });
                    });
                }
            } catch (err) { log("Error conexión"); }
            await new Promise(r => setTimeout(r, 10000));
        }
    };
    reader.readAsText(file);
});