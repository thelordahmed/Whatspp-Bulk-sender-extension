// util functions START
function randint(min=Number, max=Number) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function delay(t=Number){
    return new Promise(resolve => setTimeout(resolve, t));
}

function formatPhone(phone) {
    phone = phone.toString();
    let symbols = [/\-/g, /\(/g, /\)/g, / /g, /\+/g]
    symbols.forEach((sym) => {
        phone = phone.replace(sym, "")
    })
    return phone
}
// util functions END

// check for element appearance every {delay} millieseconds
class Whatsapp {
    constructor() {
        this.clipButton = '[data-icon="clip"]'
        this.sendButton = '[data-icon="send"]'
        this.imageInput = 'input[type="file"][accept*="image/*,video"]'
        this.textInput = '[contenteditable="true"]'
    }
    isElementVisible(selector, every) {
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
            }, every)
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

    openChat(phone=String) {
        // for later to click on OK button if chat was not opened
        // document.querySelector('[data-animate-modal-popup="true"] div[role="button"]').click()
        return new Promise((resolve) => {
            let webApiEelem = document.getElementById("#chatOpener");
            if (!webApiEelem) {
                webApiEelem = document.createElement("a");
                webApiEelem.setAttribute("id", "chatOpener");
                document.body.appendChild(webApiEelem);
            }
            
            phone = formatPhone(phone);
            webApiEelem.setAttribute(
                "href", 
                `https://api.whatsapp.com/send?phone=${phone}`
                );

            setTimeout(() => {
                webApiEelem.click();
                resolve();
            }, randint(1000, 2500))
            
        }) 
    }

   // returns false if number is invalid
    isChatOpened() {
        return new Promise((resolve) => {
        // RANDOM DELAY 
        delay(randint(1000, 2000)).then(() => {
                let interval = setInterval(() => {
                    if (document.querySelector('[data-animate-modal-body="true"] svg')) {
                        console.log("waiting for chat...")
                    } else {
                        clearInterval(interval)
                        let btn = document.querySelector('[data-animate-modal-popup="true"] div[role="button"]');
                        if (btn) {
                            delay(1000).then(() => {
                                btn.click();
                                resolve(false);
                                console.log("Resolved False!")
                            })
                        } else {
                            resolve(true)
                            console.log("Resolved!")
                        }
                    }
                }, 500)
            })
        })
    }

    // returns false if number is blocking the sender
    sendText(message, asCaption = false) {
        return new Promise((resolve) => {
            let messageBox;
            if (asCaption) {
                messageBox = document.querySelectorAll('[contenteditable="true"]')[0];
            } else {
                messageBox = document.querySelectorAll('[contenteditable="true"]')[1]
            }
            if (messageBox) {
                messageBox.dispatchEvent(new InputEvent("input", {
                    data: message,
                    bubbles: true,
                    cancelable: false,
                    cancelBubble: false,
                    currentTarget: null,
                    inputType: "insertText",
                    dataTransfer: null,
                    defaultPrevented: false,
                    detail: 0,
                    eventPhase: 0,
                    isComposing: false,
                    returnValue: true,
                    sourceCapabilities: null,
                    type: "input",
                    view: null,
                    which: 0,
                    composed: true,
                    view: window,
                    detail: 1
                }));
                delay(randint(1000, 2000)).then(() => {
                    document.querySelector(this.sendButton).click();
                    resolve(true);
                })
            } else {
                resolve(false);
            }
        })
    }

    sendImage(extensionInput, withCaption=false, message=null) {
        return new Promise((resolve) => {
            let clipBtn = document.querySelector(this.clipButton);
            let whatsappInput = document.querySelector(this.imageInput);
            if (!whatsappInput) {
                clipBtn.click();
            }
            // wait for input to appear
            setTimeout(() => {
                whatsappInput = document.querySelector(this.imageInput);
                whatsappInput.files = extensionInput.files;
                whatsappInput.dispatchEvent(new Event("change", { bubbles: true }));
                setTimeout(() => {
                    if (withCaption) {
                        this.sendText(message, true).then(() => resolve())
                    } else {
                        document.querySelector("[data-icon='send']").click();
                        resolve();
                    }

                }, randint(1500, 3000));
            }, randint(1000, 1500));
        })
    }
}