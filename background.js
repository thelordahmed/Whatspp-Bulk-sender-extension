let popupID = 0;

// opens pop up interface window or set focus on it if it's already opened
chrome.action.onClicked.addListener(() => {
    chrome.windows.update(popupID, {focused:true}, () => {
        if (chrome.runtime.lastError) {
            chrome.windows.create({
                url: chrome.runtime.getURL("index.html"),
                type: "panel",
                focused: true,
                height: 670,
                width: 550,
            }, (createdwindow) => {
                popupID = createdwindow.id;
                // saving window ID
                chrome.storage.local.set({ "windowID": popupID });
            })
        }
    })


})
