// STATES & EVENTS
const SENT_STATE = "Message Sent!"
const NOTFOUND_STATE = "No WhatsApp"
const IDLE_STATE = "---"
const MSG_SENT_EVENT = "messageSent"

const wa = new Whatsapp()
// INJECTING ATTACHMENT INPUT
let mediaInput = document.createElement("input")
mediaInput.id = "mediaInput"
mediaInput.multiple = true
mediaInput.type = "file"
document.body.appendChild(mediaInput)


// STATE INITIALIZATION
window.addEventListener("load", async () => {
    // DEFAULT STATE
    chrome.storage.local.set({ "state": "stopped" })
    chrome.storage.local.set({ "pendingStop": false })
    // GET THE LOGGED IN WHATSAPP NUMBER
    let number = await getLoggedInWhatsApp()
    chrome.storage.local.set({ "senderNumber": number })
    chrome.runtime.sendMessage({ message: "got logged in whatsapp" })
})

// Error Handler



//////////////////////////////////////////////////////////////////////
// MESSAGE LISTENERS

/* 
BUG NOTE: "sender" param must be passed to onMessage listener even if it's not used
and sendResponse() must be called to avoid port closing bug
*/

// Attachments Button Clicked
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message.toLowerCase() === "media clicked") {
        // BUG FIX: The message port closed before a response was received.
        sendResponse()
        document.getElementById("mediaInput").click()
    }
})

// Start Sending Button Clicked
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message.toLowerCase() === "start sending") {
        // BUG FIX: The message port closed before a response was received.
        sendResponse()
        startSending()
    }
})


//////////////////////////////////////////////////////////////////////
// Elements Listeners

// return selected attachments as string to show it on UI
mediaInput.addEventListener("input", () => {
    let files = ""
    Array.from(mediaInput.files).forEach(file => {
        files += file.name + ", "
    })
    chrome.runtime.sendMessage({ message: "choosed media", data: files.slice(0, -2) })
})

//////////////////////////////////////////////////////////////////////
// Custom Events Listeners

document.addEventListener(MSG_SENT_EVENT, (data) => {
    alert(data.detail.message)
})


//////////////////////////////////////////////////////////////////////
// Functions  ////////////////

// Check If Data Exists in Storage and Returns it
async function fetchStorage(key) {
    let data = await chrome.storage.local.get(key)
    if (data[key]) {
        return data[key]
    }
}

// Sending Process
async function startSending() {
    let sheetData = await fetchStorage("sheetData")
    let sendingOrder = await fetchStorage("sendingOrder")
    let messageContent = await fetchStorage("messageContent")
    let limiterObj = await fetchStorage("messagesLimit")
    let messagesLimit = parseInt(limiterObj.messages)
    let minutesLimit = parseInt(limiterObj.minutes)
    let randomDelay = await fetchStorage("delay")
    let minDelay = parseInt(randomDelay.min)
    let maxDelay = parseInt(randomDelay.max)
    let i = 0
    let sent = 0
    // CHANGE APP STATE TO START
    chrome.runtime.sendMessage({ message: "started sending" })
    // WAIT FOR WHATSAPP TO LOAD
    await wa.isElementVisible(wa.textInput, 1000)
    // SENDING LOOP START
    for (i; i < sheetData.length; i++) {
        // STOP BTN CLICK CHECK
        if (await fetchStorage("pendingStop")) {
            chrome.runtime.sendMessage({ message: "stopped sending" })
            break
        }
        // MESSAGES LIMIT
        if (sent >= messagesLimit) {
            sent = 0  // reset sent
            let delayMillieseconds = minutesLimit * 60000
            chrome.runtime.sendMessage({
                message: "limit reached",
                delay: delayMillieseconds
            })
            await delay(delayMillieseconds)
        }
        // SKIP "not found" NUMBERS AND "sent" NUMBERS
        let rowObj = sheetData[i]
        if (rowObj.state === NOTFOUND_STATE || rowObj.state === SENT_STATE) {
            continue
        }
        // CHOOSING NUMBERS COLUMN
        let columnA_checked = await fetchStorage("column")
        let name = columnA_checked === "a" ? rowObj.row[1] : rowObj.row[0]
        let phone = columnA_checked === "a" ? rowObj.row[0] : rowObj.row[1]
        // ADDING CONTANT NAME TO MESSAGE CONTENT
        if (name) {
            message = messageContent.replace(/{name}/g, name)
        } else {
            message = messageContent.replace(/{name}/g, "")
        }
        await wa.openChat(phone)
        if (await wa.isChatOpened()) {
            // STOP BTN CLICK CHECK
            if (await fetchStorage("pendingStop")) {
                chrome.runtime.sendMessage({ message: "stopped sending" })
                break
            }
            // CHECK SENDING ORDER
            if (sendingOrder === "textFirst") {
                // SEND TEXT
                await wa.sendText(message)
                // SEND MEDIA
                if (mediaInput.files.length > 0) {
                    await wa.sendImage(mediaInput)
                }
            } else if (sendingOrder === "attachmentFirst") {
                // SEND MEDIA
                if (mediaInput.files.length > 0) {
                    await wa.sendImage(mediaInput)
                }
                // SEND TEXT
                await delay(randint(1500, 3000)) // wait for image view to disappear
                await wa.sendText(message)
            } else {
                // SEND MEDIA WITH CAPTION
                if (mediaInput.files.length > 0) {
                    await wa.sendImage(mediaInput, true, message)
                } else {
                    wa.sendText(message)
                }
            }
            // UPDATE STATE
            sheetData[i].state = SENT_STATE
            sent += 1
            // LICENSE KEY CHECK
            let isKeyActivated = await fetchStorage("isKeyActivated")
            if (!isKeyActivated.status) {
                // DECREASE FREE MESSAGES ON THE SERVER
                chrome.runtime.sendMessage({ message: "decrease free messages" })
                // CHECK IF OUT OF FREE MESSAGES
                let freeMessages = await fetchStorage("freeMessages")
                if (freeMessages.remaining <= 0) {
                    chrome.runtime.sendMessage({ message: "out of free messages" })
                    break
                }
            }
        } else {
            // UPDATE STATE
            sheetData[i].state = NOTFOUND_STATE
        }
        // CALC PROGRESS BAR VALUE
        let precentage = Math.round((((i + 1) / sheetData.length) * 100)) + "%"
        // SAVING TO STORAGE
        await chrome.storage.local.set({ "sheetData": sheetData })
        await chrome.storage.local.set({ "progressBar": precentage })
        // ADDING TO REPORT TABLE & UPDATING PROGRESS BAR
        chrome.runtime.sendMessage({
            message: "report table and progress bar",
            name: name,
            number: phone,
            state: sheetData[i].state,
        })
        // RANDOM DELAY
        console.log("random delay start")
        await delay(randint(minDelay * 1000, maxDelay * 1000))
        console.log("random delay end")
    }
    // SENDING LOOP END ***
    // CHECK IF STOPPED OR FINISHED
    if (await fetchStorage("pendingStop")) {
        chrome.storage.local.set({ "pendingStop": false })
    } else {
        chrome.runtime.sendMessage({ message: "finished sending successfully!" })
    }
    
}

async function getLoggedInWhatsApp() {
    // WAIT FOR WHATSAPP TO LOAD
    await wa.isElementVisible(wa.textInput, 1000)
    // GETTING LOGGED IN WHATSAPP NUMBER
    let sender_number;
    if (window.localStorage.getItem("last-wid")) {
        let data = window.localStorage.getItem("last-wid");
        sender_number = data.split("@")[0].substring(1);
    } else {
        let data = window.localStorage.getItem("last-wid-md");
        sender_number = data.split(":")[0].substring(1);
    }
    return sender_number
}
//////////////////////////////////////////////////////////////////////

