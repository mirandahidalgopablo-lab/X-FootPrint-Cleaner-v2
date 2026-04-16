chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "borrar") {
        ejecutarBorradoMasivo(request.ids);
    }
});

async function ejecutarBorradoMasivo(ids) {
    for (const id of ids) {
        window.location.href = `https://x.com/i/status/${id}`;
        await new Promise(r => setTimeout(r, 5000));

        try {
            let menu = document.querySelector('[data-testid="caret"]');
            if (menu) {
                menu.click();
                await new Promise(r => setTimeout(r, 1000));
                
                let btnDel = document.querySelector('[data-testid="tweetDelete"]');
                if (btnDel) {
                    btnDel.click();
                    await new Promise(r => setTimeout(r, 1000));
                    
                    let confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
                    if (confirm) confirm.click();
                }
            }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 2000));
    }
}