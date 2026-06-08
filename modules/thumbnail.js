//handles everything thumbnail related

//trying to get best thumbnail url res
function getBestThumbnailUrl(url) {
    return url.replace(
        /hqdefault|mqdefault|sddefault|default/,
        "maxresdefault"
    );
}

// the main download function
function downloadThumbnail(link, imageUrl) {
    const bestUrl = getBestThumbnailUrl(imageUrl);
    //trying max res first, fallback to original if it fails
    attemptDownload(bestUrl, "thumbnail.png")
        .catch(() => attemptDownload(imageUrl, "thumbnail.png"));
}

//jpg to png
function convertToPng(blob) {
    return new Promise((resolve) => {
        const img  = new Image();
        const tempUrl = URL.createObjectURL(blob);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width  = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            // release the temp url now that the
            // image is drawn onto the canvas
            URL.revokeObjectURL(tempUrl);

            // toBlob exports the canvas as a real png
            canvas.toBlob(resolve, "image/png");
        };

        img.src = tempUrl;
    });
}

function attemptDownload(url, filename) {
    return fetch(url)
        .then(res => {
            if (!res.ok) throw new Error("fetch failed");
            return res.blob();
        })
        .then(blob => convertToPng(blob))
        .then(pngBlob => {
            const blobUrl = URL.createObjectURL(pngBlob);
            const a       = document.createElement("a");

            a.href          = blobUrl;
            a.download      = filename;
            a.style.display = "none";

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        });
}