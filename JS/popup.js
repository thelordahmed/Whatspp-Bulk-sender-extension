const excelInput = document.getElementById("excel-sheet")
const mediaBtn = document.getElementById("mediaBtn")
const sendingBtn = document.getElementById("sendBtn")
const prgoressBar = document.getElementById("progressBar")
const messageBox = document.getElementById("messagebox")
const numbersColumns = document.getElementById("numbersColumns")
const excelBtn = document.getElementById("excelBtn")
const excelFileName = document.getElementById("sheetFileName")
const mediaFileName = document.getElementById("mediaView")

// FetchStorage("sheetData").then((data) => data ? alert(data) : false)
// FetchStorage("sheetFileName").then((data) => data ? alert(data) : false)
// FetchStorage("messageContent").then((data) => data ? alert(data) : false)

// onstart updating UI with storage data
window.addEventListener("load", () => {
    updateUI();
})



// MESSAGE LISTENERS /////////
// showing selected media files on UI
chrome.runtime.onMessage.addListener(async (request) => {
    if (request.message === "choosed media") {
        // avoiding losing focus on UI when opening file picker
        let result = await chrome.storage.local.get("windowID")
        chrome.windows.update(result.windowID, {focused: true})
        let filesText = request.data
        mediaFileName.innerText = (filesText.length > 50) ? request.data.substring(0, 50) + " ..." : request.data
    }
})
//////////////////////////////////////////////////////////////////////
// ELEMENTS LISTENERS //////////////

// Attachments btn clicked
mediaBtn.addEventListener("click", () => {
    chrome.tabs.query({ url: "https://web.whatsapp.com/" },
        (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { message: "media clicked" })
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
    chrome.storage.local.set({sheetFileName: filename})
    excelFileName.innerText = filename
    // showing columns radio buttons
    if (excelInput.files.length > 0) {
        numbersColumns.classList.remove("d-none");
    } else {
        if (!numbersColumns.classList.contains("d-none")) {
            numbersColumns.classList.add("d-none");
        }
    }
    // processing sheet data
    readXlsxFile(excelInput.files[0]).then((rowsList) => {
        // rowsList: list of lists
        chrome.storage.local.set({"sheetData": rowsList})
    })
})

// Message Box TextArea FocusOut
messageBox.addEventListener("focusout", () => {
    chrome.storage.local.set({"messageContent": messageBox.value})
})

//////////////////////////////////////////////////////////////////////
// Functions  ////////////////

// Collect UI Inputs Values
async function getUIData() {
    let filename = await chrome.storage.local.get("sheetFileName")
    // let sheetData = await chrome.storage.local.get("sheetData")
    let message = await chrome.storage.local.get("messageContent")
    return UIdata = {
        sheetFileName: Object.keys(filename).length > 0 ? filename.sheetFileName : null,
        // sheetData: Object.keys(sheetData).length > 0 ? sheetData.sheetData : null,
        message: Object.keys(message).length > 0 ? message.messageContent : null,
    }
}

// Update UI Inputs with Saved Data
async function updateUI() {
    let dataObj = await getUIData();
    let sheetData = await chrome.storage.local.get("sheetData")
    excelFileName.innerText = dataObj.sheetFileName;
    messageBox.value = dataObj.message
    if (sheetData.sheetData) {
        if (sheetData.sheetData.length > 0) {
            numbersColumns.classList.remove("d-none");
        } else {
            if (!numbersColumns.classList.contains("d-none")) {
                numbersColumns.classList.add("d-none");
            }
        }
    }
}

/** @param {string} key */
// Check If Data Exists in Storage and Returns it
async function FetchStorage(key) {
    let data = await chrome.storage.local.get(key)
    if (data[key]) {
        return data[key]
    }
}

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