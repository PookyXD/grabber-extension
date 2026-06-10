// Grabber - content script
// this file will run on every page the user visits

//track of pooks
let pooksEl = null; //DOM element
let currentThumb = null; //the ancestor tag pooks is on

function removePooks() {
    if (pooksEl) {
        pooksEl.remove();
        pooksEl = null;
    }

     currentThumb = null;

}

//quality panel

let qualityPanel = null;

function removeQualityPanel(){
    if (qualityPanel) {
        qualityPanel.remove();
        qualityPanel = null;
    }
}

function showQualityPanel(link){
    //remove first
    removeQualityPanel();

    const href = link.href;
    console.log("Grabber: video URL is", href);
    qualityPanel = document.createElement("div");

    //DESIGN -placeholder
    qualityPanel.style.cssText = `
        position: fixed;
        z-index: 99999;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-family: sans-serif;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    const rect = pooksEl.getBoundingClientRect();
    qualityPanel.style.left = rect.left + "px";

    //build quality buttons
    const qualities = ["1080p", "720p", "480p", "audio only"];

    qualities.forEach(quality => {
        const btn = document.createElement("button");
        btn.textContent = quality;

        //DESIGN: button styles
        btn.style.cssText = `
            padding: 6px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f9f9f9;
            cursor: pointer;
            font-size: 13px;
            text-align: left;
        `;
        btn.addEventListener("click", (e) => {
            e.stopPropagation();

            //mapping "audio only"
            const qualityKey = quality == "audio only" ? "audio" : quality;

            startVideoDownload(href,qualityKey);
            removeQualityPanel();
            removePooks();
        });

        qualityPanel.appendChild(btn);
    });
    //closing panel when clicked outside
    document.addEventListener("click", removeQualityPanel, { once: true});

    document.body.appendChild(qualityPanel);
}

//progress panel
let progressPanel = null;
function removeProgressPanel() {
    if (progressPanel) {
        progressPanel.remove();
        progressPanel = null;
    }
}

function showProgressPanel() {
    removeProgressPanel();

    progressPanel = document.createElement("div");

    //DESIGN
    progressPanel.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 14px 16px;
        font-family: sans-serif;
        font-size: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 260px;
        max-width: 340px;
    `;

    progressPanel.innerHTML = `
        <div style="font-weight:600; margin-bottom:8px;">
            Grabber is working...
        </div>
        <div id="grabber-progress-text"
             style="color:#555; word-break:break-all;">
            Starting download...
        </div>
    `;

    document.body.appendChild(progressPanel);
}

function updateProgressPanel(text) {
    if (!progressPanel) return;
    const el = progressPanel.querySelector("#grabber-progress-text");
    if (el) el.textContent = text;
}

function showDonePanel() {
    if (!progressPanel) return;
    const el = progressPanel.querySelector("#grabber-progress-text");
    if(el) {
        el.textContent = "✅ Download complete!";

        //DESIGN: completion animation
        setTimeout(() => removeProgressPanel(), 3000);
    }
}

function showErrorPanel(msg) {
    if (!progressPanel) return;
    const el = progressPanel.querySelector("#grabber-progress-text");
    if (el) {
        el.textContent = "❌ " + msg;
        setTimeout(() => removeProgressPanel(), 4000);
    }
}




//starts the video download by sending request to background.js
function startVideoDownload(url,quality) {
    showProgressPanel();

    browser.runtime.sendMessage({
        action: "download",
        url: url,
        quality: quality
    }).then(response => {
        console.log("Grabber: download started", response);
    }).catch(err => {
        console.log("Grabber: download failed", err);
        showErrorPanel("Could not reach download host");
    });
}

function showPooks(link, imageUrl, mode) {

        //checking for pooks is already on this exact thumbnail to stop him from flickering
        if (currentThumb == link) return;

        //removing pooks before getting onto next thumbnail
        removePooks();

        //current thumbnail
        currentThumb = link;

        //always find thumbnail even in video mode
        const img = link.querySelector("img");
        const thumbUrl = imageUrl || (img ? img.src : null);

        //storing the mode
        const currentMode = mode;

        const card = link.closest(
            "ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer"
        );
        const titleLink = card
            ? card.querySelector(".ytLockupMetadataViewModelTitle") || link
            : link;

        //building and positioning pooks
        pooksEl = document.createElement("div");

        //styles for pooks to be on TOP of everything 
        pooksEl.style.cssText = `
            position: fixed;
            z-index: 99999;
            width: 64px;
            height: 64px;
            cursor: pointer;
            transition: transform 0.15s ease, opacity 0.15s ease;
            transform: scale(0.6);
            opacity: 0;
            pointer-events: auto;
        `;

        //SVG placeholder for pooks
        pooksEl.innerHTML = `
            <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <!-- Body -->
            <circle cx="32" cy="36" r="16" fill="#f9c74f"/>
            <!-- Head -->
            <circle cx="32" cy="22" r="14" fill="#f9c74f"/>
            <!-- Left ear -->
            <polygon points="20,12 16,2 26,10" fill="#f9c74f"/>
            <!-- Right ear -->
            <polygon points="44,12 48,2 38,10" fill="#f9c74f"/>
            <!-- Eyes -->
            <circle cx="27" cy="21" r="2.5" fill="#333"/>
            <circle cx="37" cy="21" r="2.5" fill="#333"/>
            <!-- Nose -->
            <ellipse cx="32" cy="25" rx="1.5" ry="1" fill="#e07b7b"/>
            <!-- Paper in hand -->
            <rect x="38" y="34" width="14" height="16" rx="2"
                    fill="white" stroke="#ccc" stroke-width="1"/>
            <!-- Lines on the paper -->
            <line x1="41" y1="39" x2="49" y2="39"
                    stroke="#aaa" stroke-width="1"/>
            <line x1="41" y1="43" x2="49" y2="43"
                    stroke="#aaa" stroke-width="1"/>
            <line x1="41" y1="47" x2="46" y2="47"
                    stroke="#aaa" stroke-width="1"/>
            </svg>
        `;

        //getBoundingClientRect() gives us the exact position and size
        //of the thumbnail on screen rn we use this to place pooks

        const rect = link.getBoundingClientRect();

        //putting pooks on top right corner of the thumbnail
        pooksEl.style.left = (rect.left + 4) + "px";
        pooksEl.style.top = (rect.top + 4) + "px";

        //attaching a data attribute to store the image URL
        //on the element itself
        pooksEl.dataset.imageUrl = imageUrl;

        pooksEl.dataset.imageUrl = thumbUrl || "";

        //adding pooks to the page
        document.body.appendChild(pooksEl);

        //clicking pooks triggers the download
        pooksEl.addEventListener("click", (event) => {
            event.stopPropagation();
            event.preventDefault();

            //grabbing the image URL stored on the element
            const imageUrl = pooksEl.dataset.imageUrl;
            
            if (currentMode === "thumbnail") {
                downloadThumbnail(titleLink, pooksEl.dataset.imageUrl);

                // DESIGN: grab feedback
                if (pooksEl) {
                    pooksEl.style.transform = "scale(1.3)";
                    setTimeout(() => {
                        if (pooksEl) pooksEl.style.transform = "scale(1)";
                    }, 150);
                }
            } else if (currentMode === "video") {
                //quality selector panel
                showQualityPanel(titleLink);
            }
        });

        //pop in animation on the next frame
        //requestAnimationFrame for browser to register the initial state
        requestAnimationFrame(() => {
            if (pooksEl){
                pooksEl.style.transform = "scale(1)";
                pooksEl.style.opacity = "1";
            }
        });
}

//checking for yt vid link
function isYouTubeVideoLink(link) {
    const href = link.getAttribute("href");
    if (!href) return false;

    return href.includes("/watch?v=") || href.includes("youtu.be/");
}

//mouseover runs whenever cursor enters an element
document.addEventListener("mouseover", (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    //video link hover
    if (isYouTubeVideoLink(link)) {
        showPooks(link, null, "video");
        return;
    }

    //thumbnail hover
    const img = link.querySelector("img");
    if (img && img.src.includes("ytimg.com")) {
        showPooks(link, img.src, "thumbnail");
        return;
    }

});

//hiding pooks when cursor leaves the thumbnail
document.addEventListener("mouseout", (event) => {
    const link = event.target.closest("a");

    //relatedTarget is where the cursor is going next
    //so we track if the cursor is moving onto pooks himself
    //and we do NOT remove him so he doesnt just vanish 
    if (link && link == currentThumb) {
        if (pooksEl && pooksEl.contains(event.relatedTarget)) return;
        removePooks();
    }
});


//listen for progress from background.js
browser.runtime.onMessage.addListener((message) => {

    console.log("content got message:", message);

    if (message.type !== "native_message") return;

    const data = message.data;

    if(data.type === "progress") {
        const text = data.line.replace("[download]", "").trim();
        updateProgressPanel(text);
    }

    if (data.type === "done") {
        showDonePanel();
    }

    if (data.type === "error") {
        showErrorPanel(data.message);
    }
});