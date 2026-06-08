# this script is for bridging the gap between firefox extension
# and yt-dlp to download audio and video files

import sys
import json
import struct
import subprocess
import os

if sys.platform == "win32":
    import msvcrt
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
#message read/write with firefox

def read_message():
    #reading the first 4 bytes to get the message length
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    length = struct.unpack('<I', raw_length)[0]
    #read bytes and decode as JSON
    message = sys.stdin.buffer.read(length).decode('utf-8')
    return json.loads(message)

def send_message(data):
    
    #encoding json
    encoded = json.dumps(data).encode('utf-88')

    sys.stdout.buffer.write(struct.pack('<I', len(encoded)))

    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


#download handler -- recieves url and quality from extension
#runs yt-dlp to download both audio and video files
#puts it back to the extension

def download_video(url, quality, download_dir):

    #yt-dlp to download both files and ffmpeg to merge them

    format_map = {
        "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
        "720p":  "bestvideo[height<=720]+bestaudio/best[height<=720]",
        "480p":  "bestvideo[height<=480]+bestaudio/best[height<=480]",
        "audio": "bestaudio/best"
    }

    fmt = format_map.get(quality, format_map["720p"])

    output_template = os.path.join(download_dir, "%(title)s.%(ext)s")

    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--format", fmt,
        "--output", output_template,
        "--merge-output-format", "mp4",
        "--newline", #progress on new line

        url
    ]

    #progress updates as subprocesses with Popen

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    for line in process.stdout:
        line = line.strip()
        if not line:
            continue

        #each yt-dlp progress line sent back to the extension

        if "[download]" in line:
            send_message({"type": "progress", "line": line})

    process.wait()

    if process.returncode == 0:
        send_message({"type": "done", "message": "Download compelte"})
    else:
        send_message({"type": "error", "message": "yt-dlp failed"})


#main loop for message from the extension
#each message comes in as JSON

def main():
    while True:
        message = read_message()
        if message is None:
            break

        action = message.get("action")

        if action == "download":
            url = message.get("url")
            quality = message.get("quality", "720p")

            #saves to users downloads folder (default)
            download_dir = os.path.join(os.path.expanduser("~"), "Downloads")

            download_video(url, quality, download_dir)

        elif action == "ping":
            #extension pings on startup to check on host
            send_message({"type": "pong"})

if __name__ == "__main__":
    main()
