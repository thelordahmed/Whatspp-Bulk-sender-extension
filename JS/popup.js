/*
--Storage Structure--
    sheetData: [{row:[], state:""}]
    sheetFileName: ""
    messageContent: ""
    column: "a" or "b"
    windowID: number
    messagesLimit: {messages:"number", minutes:"number"}
    sendingOrder: "textFirst" OR "attachmentFirst" OR "caption"
    delay: {min: "number", max: "number"}
    progressBar: ""
    state: "stopped" or "working"
    pendingStop: true or false
    senderNumber: ""
    freeMessages: {remaining: "number", max: "number"}
    userid: ""
    key: ""
    isKeyActivated: {status: boolean, expire: "Date"}
    currentContact: {name: "", phone: ""}
*/
let wa_interval;
const SENT_STATE = "Message Sent!"
const NOTFOUND_STATE = "No WhatsApp"
const NOCODE_STATE = "No Country Code"
const BLOCKED_STATE = "Blocked Contact"
const IDLE_STATE = "---"
const APP_NAME = "Whatsapp Chrome Extension"
const excelInput = document.getElementById("excel-sheet")
const mediaBtn = document.getElementById("mediaBtn")
const sendingBtn = document.getElementById("sendBtn")
const clearBtn = document.getElementById("clearBtn")
const prgoressBar = document.getElementById("progressBar")
const messageBox = document.getElementById("messagebox")
const numbersColumns = document.getElementById("numbersColumns")
const excelBtn = document.getElementById("excelBtn")
const excelFileName = document.getElementById("sheetFileName")
const mediaFileName = document.getElementById("mediaView")
const radioColA = document.getElementById("col_a")
const radioColB = document.getElementById("col_b")
const messagesInputRange = document.getElementById("messagesRange")
const messagesBadge = document.getElementById("messagesBadge")
const minutesInput = document.getElementById("minutes")
const progressBar = document.getElementById("progressBar")
const sendingOrderRadio = document.getElementById("sendingOrder")
const reportTab = document.getElementById("report-tab")
const addName = document.getElementById("addName")
const freeMessages = document.querySelector("#freeMessages #remaining")
const freeMessages_max = document.querySelector("#freeMessages #max")
const activateBtn = document.getElementById("activate")
const minDelay = document.getElementById("minDelay")
const maxDelay = document.getElementById("maxDelay")



// onstart updating UI with storage data
window.addEventListener("load", async () => {
    updateUI()
    // INITIALIZE "isKeyActivated" VALUE TO FALSE ; TO KEEP CHECKING THE API ON EVERY APP START
    chrome.storage.local.set({ "isKeyActivated": { status: false, expire: null } })
    // SHOW LOADING IF NO ACTIVE KEY AND NO FREE MESSAGES
    let isKeyActivated = await fetchStorage("isKeyActivated")
    if (!isKeyActivated.status) {
        let state = await fetchStorage("state")
        if (state == "working") {
            return;
        }
        Swal.fire({
            allowEscapeKey: false,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading()
            }
        });
    } else {
        grantAccess(isKeyActivated.expire)
    }
    // RELOADING WHATSAPP
    let webTab = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
    if (webTab[0]) {
        chrome.tabs.update(webTab[0].id, { active: true })
        let state = await fetchStorage("state")
        if (state !== "working") {
            chrome.tabs.reload(webTab[0].id)
        }
    }
})



//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
// MESSAGE LISTENERS 
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

// showing selected media files on UI
// *Note: the attachment input is injected to Whatsapp web page*
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.message === "choosed media") {
        sendResponse() // BUG FIX
        // avoiding losing focus on UI when opening file picker
        let result = await chrome.storage.local.get("windowID")
        chrome.windows.update(result.windowID, { focused: true })
        let filesText = request.data
        mediaFileName.innerText = (filesText.length > 50) ? request.data.substring(0, 50) + " ..." : request.data
    }
})

// adding to report table and updating progress bar
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    sendResponse();
    if (request.message === "report table and progress bar") {
        addToReportTable(request.name, request.number, request.state)
        let value = await fetchStorage("progressBar")
        progressBar.innerText = value
        progressBar.dispatchEvent(new Event("change", { bubbles: true }))
    }
})

// Stopped App Loop
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    sendResponse();
    if (request.message === "stopped sending") {
        await chrome.storage.local.set({ "state": "stopped" })
        sendingBtn.disabled = false;
        sendingBtn.classList.remove("btn-danger")
        sendingBtn.classList.add("btn-success")
        sendingBtn.innerText = "Start sending"
        // STOP URL INTERVAL
        clearInterval(wa_interval)
    }
})
// Started App Loop 
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    sendResponse();
    if (request.message === "started sending") {
        await chrome.storage.local.set({ "state": "working" })
        sendingBtn.disabled = false;
        sendingBtn.classList.remove("btn-success")
        sendingBtn.classList.add("btn-danger")
        sendingBtn.innerText = "Stop sending"
        reportTab.click()
        // Interval Check If Whatsapp Page URL Changed
        chrome.tabs.query({ url: 'https://*.whatsapp.com/*' }).then(wa_tab => {
            // Back Func
            function go_back() {
                history.back()
            }
            wa_interval = setInterval(async () => {
                let tmp = await chrome.tabs.query({ url: 'https://*.whatsapp.com/*' })
                if (wa_tab[0].url !== tmp[0].url) {
                    // GOING BACK TO WHATSAPP PAGE
                    await chrome.scripting.executeScript({
                        target: { tabId: tmp[0].id },
                        func: go_back
                    })
                    // SYNC CURRENT CONTACT WITH SHEET DATA
                    let currentContact = await fetchStorage("currentContact")
                    let sheetData = await fetchStorage("sheetData")
                    let columnA_checked = await fetchStorage("column")
                    for (let i=0; i < sheetData.length; i++){
                        let rowObj = sheetData[i]
                        let phone = columnA_checked === "a" ? rowObj.row[0] : rowObj.row[1]
                        if (phone === currentContact.phone) {
                            // UPDATE STATE TO NOT FOUND AND SAVE TO STORAGE
                            sheetData[i].state = NOTFOUND_STATE
                            await chrome.storage.local.set({ "sheetData": sheetData })
                        }
                    }
                    // ADD TO REPORT TABLE
                    addToReportTable(currentContact.name, currentContact.phone, NOTFOUND_STATE)
                    // WAIT FOR PAGE TO LOAD
                    await delay(5000)
                    // START SENDING REQUEST
                    chrome.tabs.sendMessage(tmp[0].id, { message: "start sending" })
                    clearInterval(wa_interval)
                }
            }, 2000)
        })
    }
})

// finished sending successfully!
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    sendResponse();
    if (request.message === "finished sending successfully!") {
        await chrome.storage.local.set({ "state": "stopped" })
        sendingBtn.disabled = false;
        sendingBtn.classList.remove("btn-danger")
        sendingBtn.classList.add("btn-success")
        sendingBtn.innerText = "Start sending"
        Swal.fire({
            title: "Completed",
            text: "Finished Sending Successfully 👍",
            icon: "success"
        })
    }
})

// Limit Delay Alert - Minutes Count Down
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    sendResponse()
    if (request.message === "limit reached") {
        let timerInterval
        Swal.fire({
            title: 'Reached Sending Limit!',
            html: 'will conitnue sending in <b></b>',
            timer: request.delay,
            timerProgressBar: true,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading()
                const b = Swal.getHtmlContainer().querySelector('b')
                timerInterval = setInterval(() => {
                    const date = new Date(Swal.getTimerLeft());
                    b.textContent = `${date.getMinutes()}:${date.getSeconds()}`
                }, 1000)
            },
            willClose: () => {
                clearInterval(timerInterval)
            }
        })
    }
})

// Got LoggedIn Whatsapp
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    sendResponse();
    if (request.message === "got logged in whatsapp") {
        // CHECK IF THERE'S SAVED KEY
        let key = await fetchStorage("key")
        let userid = await fetchStorage("userid")
        let isKeyActivated = await fetchStorage("isKeyActivated")
        /* 
        CHECK IF KEY WAS VALIDITED ALREADY IN LICENSEKEY PAGE
        TO AVOID SENDING THE REQUEST TWICE
        * the "isKeyActivated" value is initialized "false" always on app start in background script
        */
        if (isKeyActivated.status) {
            grantAccess(isKeyActivated.expire)
            Swal.hideLoading()
            Swal.clickConfirm()
            return;
        }
        if (key) {
            let endpoint = `https://script.google.com/macros/s/AKfycbwuJo2PAdmrTHdgGPyGocWTOMqh-rrqinTgbnrMbLpsbnHLPiZs33AuOAf3vFsRoZeucQ/exec/key/${key}/${userid}/${APP_NAME}`
            let data = await fetch(endpoint, { method: "GET" })
            data = await data.json()
            if (data.response === "valid") {
                // SAVING KEY STATUS
                chrome.storage.local.set({ "isKeyActivated": { status: true, expire: data.date } })
                grantAccess(data.date)
                Swal.hideLoading()
                Swal.clickConfirm()
                return;
            } else {
                chrome.storage.local.set({ "isKeyActivated": { status: false, expire: null } })
            }
        }
        // API - CHECK FREE MESSAGE
        let senderNumber = await fetchStorage("senderNumber")
        let endpoint = `https://script.google.com/macros/s/AKfycbwuJo2PAdmrTHdgGPyGocWTOMqh-rrqinTgbnrMbLpsbnHLPiZs33AuOAf3vFsRoZeucQ/exec/freemessages/${senderNumber}`
        let data = await fetch(endpoint, { method: "GET" })
        data = await data.json()
        // SAVING TO STORAGE
        await chrome.storage.local.set({ "freeMessages": { "remaining": data.messages, "max": data.max } })
        // UPDATING FREE MESSAGES COUNTER
        freeMessages.innerText = data.messages
        freeMessages_max.innerText = data.max
        // CHECK IF NO MORE FREE MESSAGES
        if (data.messages <= 0) {
            window.location.href = "licenseKey.html"
        } else {
            Swal.hideLoading()
            Swal.clickConfirm()
        }

    }
})

// Decrease Free Messages
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    sendResponse()
    if (request.message === "decrease free messages") {
        let senderNumber = await fetchStorage("senderNumber")
        let endpoint = `https://script.google.com/macros/s/AKfycbwuJo2PAdmrTHdgGPyGocWTOMqh-rrqinTgbnrMbLpsbnHLPiZs33AuOAf3vFsRoZeucQ/exec/freemessagesDecrease/${senderNumber}`
        let data = await fetch(endpoint, { method: "GET" })
        data = await data.json()
        // SAVE TO STORAGE
        await chrome.storage.local.set({ "freeMessages": { "remaining": data.messages, "max": data.max } })
        freeMessages.innerText = data.messages
    }
})

// Out Of Free Messages
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    sendResponse()
    if (request.message === "out of free messages") {
        window.location.href = "licenseKey.html"
    }
})


//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// ELEMENTS LISTENERS 
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// *Home Tab*
// Attachments btn clicked
mediaBtn.addEventListener("click", () => {
    chrome.tabs.query({ url: "https://web.whatsapp.com/" },
        (tabs) => {
            if (!tabs) {
                Swal.fire({
                    title: "WhatsApp Web Not Found!",
                    icon: "error"
                })
            } else {
                chrome.tabs.sendMessage(tabs[0].id, { message: "media clicked" })
            }

        })
})

// Excel Sheet Button Clicked
excelBtn.addEventListener("click", async () => {
    // check if there's sheet data stored
    let sheetData = await chrome.storage.local.get("sheetData")
    if (sheetData.sheetData) {
        Swal.fire({
            title: "Sheet Data Exists",
            text: "The current sheet sending history will be removed, proceed?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Proceed!'
        }).then(result => {
            if (result.isConfirmed) {
                excelInput.click()
            }
        })
    } else {
        excelInput.click()
    }

})

// Excel Sheet Input Changed
excelInput.addEventListener("change", async () => {
    // setting file name
    let filename = excelInput.files[0].name;
    chrome.storage.local.set({ sheetFileName: filename })
    excelFileName.innerText = filename
    // showing columns radio buttons
    if (excelInput.files.length > 0) {
        numbersColumns.classList.remove("d-none");
    } else {
        if (!numbersColumns.classList.contains("d-none")) {
            numbersColumns.classList.add("d-none");
        }
    }
    // reset progress bar
    progressBar.innerText = "0%"
    progressBar.dispatchEvent(new Event("change", { bubbles: true }))
    // reset report table
    let tbody = document.querySelector("#reportTable tbody")
    while (tbody.hasChildNodes()) {
        tbody.removeChild(tbody.lastChild)
    }
    // processing sheet data
    readXlsxFile(excelInput.files[0]).then(async (rowsList) => {
        let sheetData = []
        ////// TODO ////////
        let numbersCol = await fetchStorage("column")
        for (let i=0; i < rowsList.length; i++) {
            let phone = numbersCol === "b" ? rowsList[i][1] : rowsList[i][0]
            // SKIP EMPTY ROWS
            if (!phone) {
                continue
            }
            // CREATING SHEET DATA LIST
            let rowObj = {
                row: rowsList[i],
                state: IDLE_STATE
            }
            sheetData.push(rowObj)
        }
        // rowsList: list of Objects [{row: ["name", "201123123"], "state": "---"}, ...]
        chrome.storage.local.set({ "sheetData": sheetData })
        // clear the input to avoid data not changing when choosing same sheet
        excelInput.files = new DataTransfer().files
    })
})

// Message Box TextArea FocusOut
messageBox.addEventListener("change", () => {
    chrome.storage.local.set({ "messageContent": messageBox.value })
})

// Clear Button Clicked
clearBtn.addEventListener("click", () => {
    Swal.fire({
        title: "Confim",
        text: "The current sending history and saved data will be removed, proceed?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Proceed!'
    }).then(result => {
        if (result.isConfirmed) {
            let itemsToRemove = ["sheetData", "sheetFileName", "messageContent", "progressBar"]
            chrome.storage.local.remove(itemsToRemove, () => {
                Swal.fire({
                    title: "Data Cleared!",
                    icon: "success",
                    showConfirmButton: false,
                    timer: 1500
                }).then(async () => {
                    chrome.tabs.query({ url: "https://web.whatsapp.com/*" })
                        .then(tabs => chrome.tabs.reload(tabs[0].id))
                    location.reload()
                })
            })
        }
    })
})

// Sending Button Clicked
sendingBtn.addEventListener("click", async () => {
    // CHECK IF CLICKED TO STOP OR START
    let appState = await fetchStorage("state")
    if (appState === "working") {
        // SEND STOP REQUEST TO APP LOOP
        await chrome.storage.local.set({ "pendingStop": true })
        sendingBtn.disabled = true;
        return;
    }
    // CHECK IF SHEET DATA EXISTS
    let sheetData = await fetchStorage("sheetData")
    if (!sheetData) {
        Swal.fire({
            title: "Excel Sheet Not Found",
            icon: "error"
        })
        return false;
    }
    // CHECK IF MESSAGE CONTENT EXISTS
    let messageContent = await fetchStorage("messageContent")
    if (!messageContent) {
        Swal.fire({
            title: "No Message Found",
            icon: "error"
        })
        return false;
    }
    // CHECK IF WHATSAPP WEB IS OPENED
    let webTab = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
    if (webTab[0]) {
        chrome.tabs.update(webTab[0].id, { active: true })
    } else {
        // OPEN WHATSAPP AND SET FOCUS BACK ON UI
        await chrome.tabs.create({ url: "https://web.whatsapp.com/" })
        // WAIT FOR WHATSAPP TO OPENS AND LOADS CONTENT SCRIPTS
        await delay(3000)
        webTab = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
        chrome.storage.local.get("windowID", (res) => {
            chrome.windows.update(res.windowID, { focused: true })
        })
    }
    // START SENDING REQUEST
    chrome.tabs.sendMessage(webTab[0].id, { message: "start sending" }).catch((error) => {
        Swal.fire({
            title: "WhatsApp Web Not Found!",
            icon: "error"
        })
    })
})

// Column A radion clicked
radioColA.addEventListener("click", () => {
    chrome.storage.local.set({ column: "a" })
})

// Column B radion clicked
radioColB.addEventListener("click", () => {
    chrome.storage.local.set({ column: "b" })
})

// Sync ProgressBar Label with style value
progressBar.addEventListener("change", () => {
    progressBar.style.width = progressBar.innerText
    if (progressBar.style.width === "0%") {
        progressBar.parentElement.parentElement.classList.add("d-none")
    } else {
        progressBar.parentElement.parentElement.classList.remove("d-none")
    }
})

// Add Name Button
addName.addEventListener("click", () => {
    messageBox.value += "{name}"
    messageBox.dispatchEvent(new Event("change", { bubbles: true }))
})

// Activate Button
activateBtn.addEventListener("click", async () => {
    // STOP CONTENT SCRIPT LOOP IF WORKING
    let state = await fetchStorage("state")
    if (state === "working") {
        await chrome.storage.local.set({ "pendingStop": true })
    }
    // CHANGE APP STATE TO AVOID BUGS
    await chrome.storage.local.set({ "state": "stopped" })
    // REDIRECT TO LICENSE KEY PAGE
    window.location.href = "licenseKey.html"
})

// *Settings Tab*
// Messages Range Badge
messagesInputRange.addEventListener("input", () => {
    messagesBadge.innerText = messagesInputRange.value
})

// Saving Messages limits values to storage
let elems = [messagesInputRange, minutesInput]
elems.forEach(item => {
    item.addEventListener("change", async () => {
        await chrome.storage.local.set({
            "messagesLimit": {
                "messages": messagesInputRange.value,
                "minutes": minutesInput.value
            }
        })
    })
});

// Saving Sending Text Order Option to storage
sendingOrderRadio.addEventListener("change", async () => {
    if (sendingOrderRadio.querySelector("#textFirst").checked) {
        chrome.storage.local.set({ "sendingOrder": "textFirst" })
    } else if (sendingOrderRadio.querySelector("#caption").checked) {
        chrome.storage.local.set({ "sendingOrder": "caption" })
    } else {
        chrome.storage.local.set({ "sendingOrder": "attachmentFirst" })
    }
})

// Saving Delay Settings
let delayElems = [minDelay, maxDelay]
delayElems.forEach((elem) => {
    elem.addEventListener("change", async () => {
        await chrome.storage.local.set({
            "delay": {
                "min": minDelay.value,
                "max": maxDelay.value
            }
        })
    })
    
})


//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// Functions
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function delay(t = Number) {
    return new Promise(resolve => setTimeout(resolve, t));
}
// Check If Data Exists in Storage and Returns it
async function fetchStorage(key = String) {
    let data = await chrome.storage.local.get(key)
    if (data[key]) {
        return data[key]
    }
}

// Collect UI Inputs Values
async function getSavedUIData() {
    return UIdata = {
        sheetData: await fetchStorage("sheetData"),
        sheetFileName: await fetchStorage("sheetFileName"),
        column: await fetchStorage("column"),
        message: await fetchStorage("messageContent"),
        messagesLimit: await fetchStorage("messagesLimit"),
        sendingOrder: await fetchStorage("sendingOrder"),
        progressBar: await fetchStorage("progressBar"),
        delay: await fetchStorage("delay")
    }
}

// Update UI Inputs with Saved Data
async function updateUI() {
    // CHECK IF APP IS WORKING
    let state = await fetchStorage("state")
    if (state === "working") {
        // CHANGE BUTTON TO STOP SENDING STATE
        sendingBtn.disabled = false;
        sendingBtn.classList.remove("btn-success")
        sendingBtn.classList.add("btn-danger")
        sendingBtn.innerText = "Stop sending"
        reportTab.click()
    }
    let dataObj = await getSavedUIData();
    // SET EXCEL FILE NAME - DEFAULTING IF NO SAVED DATA
    excelFileName.innerText = dataObj.sheetFileName ? dataObj.sheetFileName : null
    // SET MESSAGE BOX TEXT - DEFAULTING IF NO SAVED DATA
    messageBox.value = dataObj.message ? dataObj.message : ""
    // SETTING COLUMN  - DEFAULTING TO B IF NO SAVED DATA
    if (!dataObj.column) {
        chrome.storage.local.set({ "column": "b" })
    } else {
        dataObj.column === "a" ? radioColA.checked = true : radioColB.checked = true
    }
    // SET MESSAGES NUMBER - DEFAULTING IF NO SAVED DATA
    if (!dataObj.messagesLimit) {
        let elems = [messagesInputRange, minutesInput]
        elems.forEach(elem => elem.dispatchEvent(new Event("change", { bubbles: true })))
    } else {
        messagesInputRange.value = dataObj.messagesLimit.messages
        messagesInputRange.dispatchEvent(new Event("input", { bubbles: true }))
        minutesInput.value = dataObj.messagesLimit.minutes
    }
    // SET SENDING ORDER OPTION - DEFAULTING IF NO SAVED DATA
    if (!dataObj.sendingOrder) {
        sendingOrderRadio.dispatchEvent(new Event("change", { bubbles: true }))
    } else {
        if (dataObj.sendingOrder === "textFirst") {
            document.querySelector("#textFirst").checked = true
        } else if (dataObj.sendingOrder === "caption") {
            document.querySelector("#caption").checked = true
        } else {
            document.querySelector("#attachmentFirst").checked = true
        }
    }
    // SET DELAY SETTINGS - DEFAULTING IF NO SAVED DATA
    if (!dataObj.delay) {
        let delayElems = [minDelay, maxDelay]
        delayElems.forEach(elem => elem.dispatchEvent(new Event("change", { bubbles: true })))
    } else {
        minDelay.value = dataObj.delay.min
        maxDelay.value = dataObj.delay.max
    }
    // SET PROGRESS BAR VALUE
    progressBar.innerText = dataObj.progressBar ? dataObj.progressBar : progressBar.innerText
    progressBar.dispatchEvent(new Event("change", { bubbles: true }))
    // SHOWING COLUMNS NUMBER IF SHEET DATA FOUND
    if (dataObj.sheetData) {
        if (dataObj.sheetData.length > 0) {
            numbersColumns.classList.remove("d-none");
        } else {
            if (!numbersColumns.classList.contains("d-none")) {
                numbersColumns.classList.add("d-none");
            }
        }
    }
    // SETTING REPORT TABLE IF SHEET DATA FOUND
    if (dataObj.sheetData) {
        for (let i = 0; i < dataObj.sheetData.length; i++) {
            if (dataObj.sheetData[i].state !== IDLE_STATE) {
                let numbersCol = await fetchStorage("column")
                let name = numbersCol === "b" ? dataObj.sheetData[i].row[0] : dataObj.sheetData[i].row[1]
                let phone = numbersCol === "b" ? dataObj.sheetData[i].row[1] : dataObj.sheetData[i].row[0]
                addToReportTable(name, phone, dataObj.sheetData[i].state)
            }
        }
    }
}

// Add Row to Report Table
function addToReportTable(name, phone, status) {
    let tr = document.createElement("tr")
    if (status === SENT_STATE) {
        tr.classList.add("table-success")
    } else if (status === NOTFOUND_STATE) {
        tr.classList.add("table-danger")
    } else if (status === NOCODE_STATE) {
        tr.classList.add("table-warning")
    } else if (status === BLOCKED_STATE) {
        tr.classList.add("table-danger")
    }
    let name_td = document.createElement("td")
    name_td.innerText = name
    let phone_td = document.createElement("td")
    phone_td.innerText = phone
    let status_td = document.createElement("td")
    status_td.innerText = status
    tr.appendChild(name_td)
    tr.appendChild(phone_td)
    tr.appendChild(status_td)
    document.querySelector("#reportTable tbody").appendChild(tr)
    tr.scrollIntoView({ behavior: 'smooth' });
}

// Change UI For Granted Access Users
function grantAccess(keyExpireDate) {
    let expireDate = keyExpireDate === "Lifetime" ? "Lifetime" : new Date(keyExpireDate).toDateString()
    document.querySelector("#freeMessages > p")
        .innerText = `Expire Date: ${expireDate}`
    activateBtn.classList.add("d-none")
}
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// Emojis Object
new EmojiPicker({
    trigger: [
        {
            selector: '#emoji',
            insertInto: "#messagebox" // If there is only one '.selector', than it can be used without array
        }
    ],
    closeButton: true,
    specialButtons: 'green' // #008000, rgba(0, 128, 0);
});