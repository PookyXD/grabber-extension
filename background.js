//native messaging handler
//between the extension and grabber_host.py on user's machine

let nativePort = null;

//connect to native host

function connectToHost(){
    nativePort = browser.runtime.connectNative("grabber_host");

    nativePort.onMessage.addListener((message) => {

        browser.tabs.query({ active: true, currentWindow: true})
            .then(tabs => {
                if(tabs[0]){
                    browser.tabs.sendMessage(tabs[0].id, {
                        type: "native_message",
                        data: message
                    });
                }    
            });
    });

//we log it and reset if connection drops to reconnect next time

    nativePort.onDisconnect.addListener(() => {
        console.log("Grabber: native host disconnected", browser.runtime.lastError);
        nativePort = null;
    });
}

//messages from content.js

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.action === "ping") {
        //ping checks if native host is reachable
        try {
            connectToHost();
            nativePort.postMessage({action: "ping"});
            sendResponse({ status: "ok"});
        } catch (err) {
            console.log("Native host error:", err);
            console.log("Error message:", err.message);
            console.log("Last error:", browser.runtime.lastError);
            sendResponse({ status: "error", message: err.message});
        }
        return true;
    }

    if (message.action === "download") {
        //opens connection if not already
        if (!nativePort) connectToHost();

        //sends the download request 
        //with url and quality picked by user
        nativePort.postMessage({
            action: "download",
            url: message.url,
            quality: message.quality
        });
        sendResponse({ status: "started"});
        return true;
    }
});
