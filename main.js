const wa = new Whatsapp()



let mediaInput = document.createElement("input")
mediaInput.id = "mediaInput"
mediaInput.multiple = true
mediaInput.type = "file"
document.body.appendChild(mediaInput)

///// DEBUG
chrome.storage.local.get("messageContent", (data) => console.log(data.messageContent))


// MESSAGE LISTENERS START
chrome.runtime.onMessage.addListener((request) => {
    if (request.message === "media clicked") {
        document.getElementById("mediaInput").click()
    }
})
// MESSAGE LISTENERS END


// return selected attachments as string to show it on UI
mediaInput.addEventListener("change", () => {
    let files = ""
    Array.from(mediaInput.files).forEach(file => {
        files += file.name + ", "
    })
    chrome.runtime.sendMessage({message: "choosed media", data: files.slice(0, -2)})
})


async function startSending() {
    alert("clicked!")
}
// async function test() {
//     const input_elements = "[contenteditable='true']";
//     const picture = "/Users/ahmedsaeed/Desktop/My\ Presentation/time\ -\ sand\ clock.jpg";


//     await wa.isElementVisible(input_elements, 1000);
//     await delay(1000);
//     await wa.openChat("201140973083", 500, 1500);
//     let res = await wa.isChatOpened();
//     if (res === false) {
//         console.log("not valid number")
//     } else {
//         console.log("opened chat successfully!")
//     }
//     let input = document.querySelector(wa.mediaInput);
//     let input_test = document.createElement("input");
//     input_test.id = "test-input";
//     input_test.type = "file";
//     input_test.multiple = true;
//     input_test.accept = "image/*,video/mp4,video/3gpp,video/quicktime";
//     document.body.appendChild(input_test)
//     // event
//     input_test.addEventListener("change", () => {
//         if (input) {
//             input.files = input_test.files;
//             input.dispatchEvent(new Event("change", { bubbles: true }));
//             setTimeout(() => {
//                 document.querySelector("[data-icon='send']").click();
//             }, 3000);
//         } else {
//             document.querySelector("[data-icon='clip']").click();
//             setTimeout(() => {
//                 input = document.querySelector(wa.mediaInput);
//                 input.files = input_test.files;
//                 input.dispatchEvent(new Event("change", { bubbles: true }));
//                 console.log("done");
//                 setTimeout(() => {
//                     document.querySelector("[data-icon='send']").click();
//                 }, 3000);
//             }, 2000);
//         }
//     })

//     input_test.addEventListener("click", () => {
//         console.log("clicked")
//     })

// }

// test()