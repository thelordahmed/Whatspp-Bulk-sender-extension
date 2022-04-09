// util functions START
function randint(min=Number, max=Number) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function delay(t=Number){
    return new Promise(resolve => setTimeout(resolve, t));
}
// util functions END



// check for element appearance every {delay} millieseconds
class Whatsapp {
    constructor() {
        this.clipButton = '[data-icon="clip"]'
        this.sendButton = '[data-icon="send"]'
        this.imageInput = 'input[type="file"][accept*="image/*,video"]'
    }
    isElementVisible(selector, delay=Number) {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                let element = document.querySelector(selector);
                if (element) {
                    console.log("found it!");
                    clearInterval(interval);
                    resolve();
                } else {
                    console.log("searching....");
                }
            }, delay)
        })
    }

    async clickElement(element){
        element.dispatchEvent( new MouseEvent('mouseover', {view: window, bubbles: true, cancelable: true}))
        await delay(randint(500, 1500));
        element.dispatchEvent(new MouseEvent('mousedown', { view: window, bubbles: true, cancelable: true }))
        await delay(randint(10, 50));
        element.dispatchEvent(new MouseEvent('mouseup', { view: window, bubbles: true, cancelable: true }))
        element.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }))
        return new Promise(resolve => resolve());
    }

    openChat(phone=String, minDelay=Number, maxDelay=Number) {
        // for later to click on OK button if chat was not opened
        // document.querySelector('[data-animate-modal-popup="true"] div[role="button"]').click()
        return new Promise((resolve) => {
            let webApiEelem = document.getElementById("#chatOpener");
            if (!webApiEelem) {
                webApiEelem = document.createElement("a");
                webApiEelem.setAttribute("id", "chatOpener");
                document.body.appendChild(webApiEelem);
            }

            webApiEelem.setAttribute(
                "href", 
                `https://api.whatsapp.com/send?phone=${phone}`
                );

            setTimeout(() => {
                webApiEelem.click();
                resolve();
            }, randint(minDelay, maxDelay))
            
        }) 
    }

   // returns false if number is invalid
    isChatOpened() {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if (document.querySelector('[data-animate-modal-body="true"] svg')) {
                    console.log("waiting for chat...")
                } else {
                    clearInterval(interval)
                    let btn = document.querySelector('[data-animate-modal-popup="true"] div[role="button"]');
                    if (btn) {
                        console.log("found button!")
                        setTimeout(() => {
                            btn.click();
                            resolve(false);
                        }, 1000);
                    }
                    resolve(true)
                }
            }, 500)
        })
        
    }

    // returns false if number is blocking the sender
    sendText(message = String) {
        return new Promise((resolve) => {
            let messageBox = document.querySelectorAll('[contenteditable="true"]')[1];
            if (messageBox) {
                messageBox.focus();
                messageBox.innerHTML = message;
                messageBox.dispatchEvent(new UIEvent("input", {
                    bubbles: true, 
                    cancelable: true,
                    view: window,
                    detail: 1
                }));
                delay(1000).then(() => {
                    document.querySelector(this.clipButton).click();
                    resolve(true);
                })
            } else {
                resolve(false);
            }
        })
    }

    sendImage(extensionInput) {
        return new Promise((resolve) => {
            let clipBtn = document.querySelector(this.clipButton);
            let whatsappInput = document.querySelector(this.imageInput);
            if (!whatsappInput) {
                clipBtn.click();
            }
            // wait for input to appear
            setTimeout(() => {
                whatsappInput.files = extensionInput.files;
                whatsappInput.dispatchEvent(new Event("change", { bubbles: true }));
                setTimeout(() => {
                    document.querySelector("[data-icon='send']").click();
                    resolve();
                }, randint(1500, 3000));
            }, randint(1000, 1500));
        })
    }
}