const APP_NAME = "chrome extension"

//////////////////////////////////////
///// Util 

// Check If Data Exists in Storage and Returns it
async function fetchStorage(key = String) {
    let data = await chrome.storage.local.get(key)
    if (data[key]) {
        return data[key]
    }
}


async function get_delete_userid_endpoint() {
    let userid = await fetchStorage("userid")
    let endpoint = `https://softwarekeys.herokuapp.com/key/userid/delete/${userid}`
    return endpoint
}
//////////////////////////////////////

fetchStorage("freeMessages").then((dataObj) => {
    // SHOW CANCEL BUTTON IF THERE'RE FREE MESSAGES REMAINING
    let showCancel;
    if (dataObj.remaining <= 0) {
        showCancel = false
    } else {
        showCancel = true
    }
    // POPULATE KEY INPUT WITH STORED VALUE IF FOUND
    fetchStorage("key")
        .then((key) => {
            Swal.fire({
                title: 'Enter your License Key',
                input: 'text',
                showCancelButton: showCancel,
                inputAttributes: {
                    autocapitalize: 'off',
                },
                // showCancelButton: true,
                confirmButtonText: 'Activate',
                showLoaderOnConfirm: true,
                didOpen: () => {
                    document.querySelector("input[type='text'][autocapitalize='off']")
                        .value = key ? key : ""
                },
                preConfirm: async (key) => {
                    key = key.trim()
                    // SAVE KEY TO STORAGE
                    await chrome.storage.local.set({ "key": key })
                    let userid = await fetchStorage("userid")
                    return fetch(`https://softwarekeys.herokuapp.com/key/${key}/${userid}/${APP_NAME}`, { method: "PUT" })
                        .then(async (response) => {
                            if (!response.ok) {
                                throw new Error(response.statusText)
                            }
                            response = await response.json()
                            if (response.response === "invalid") {
                                throw new Error("Invalid Key")
                            } else if (response.response === "different device") {
                                throw new Error("This Key is connected to another device")
                            } else if (response.response === "expired") {
                                throw new Error("This Key is Expired")
                            }
                            return response
                        })
                        .catch(error => {
                            Swal.showValidationMessage(
                                `${error}`
                            )
                        })
                },
                // allowOutsideClick: () => !Swal.isLoading()
                allowOutsideClick: false
            }).then(async (result) => {
                if (result.isConfirmed) {
                    if (result.value.response === "valid") {
                        await chrome.storage.local.set({ "isKeyActivated": { status: true, expire: result.value.date } })
                        // SET UNINSTALL URL ; TO REMOVE THE USERID FROM THE SERVER ON UNINSTALL
                        let url = await get_delete_userid_endpoint()
                        chrome.runtime.setUninstallURL(url)
                        window.location.href = "index.html"
                    }
                } else {
                    window.location.href = "index.html"
                }
            })
        })
})


