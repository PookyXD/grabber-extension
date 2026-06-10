# this script is for bridging the gap between firefox extension
# and yt-dlp to download audio and video files

import sys
import json
import struct
import subprocess
import os

# emergency log — writes before anything else runs
LOG_PATH = os.path.join(os.path.expanduser("~"), "grabber_debug.log")

def log(msg):
    with open(LOG_PATH, "a") as f:
        f.write(str(msg) + "\n")

log("SCRIPT STARTED")

try:
    if sys.platform == "win32":
        import msvcrt
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
        log("binary mode set")

    stdin_bin  = open(sys.stdin.fileno(),  "rb", closefd=False, buffering=0)
    stdout_bin = open(sys.stdout.fileno(), "wb", closefd=False, buffering=0)
    log("binary streams opened")

except Exception as e:
    log(f"SETUP CRASH: {e}")
    import traceback
    log(traceback.format_exc())
    sys.exit(1)

def read_message():
    raw_length = b""
    while len(raw_length) < 4:
        chunk = stdin_bin.read(4 - len(raw_length))
        if not chunk:
            return None
        raw_length += chunk

    length = struct.unpack("<I", raw_length)[0]

    if length > 1024 * 1024:
        log(f"bad length received: {length}")
        return None

    message = b""
    while len(message) < length:
        chunk = stdin_bin.read(length - len(message))
        if not chunk:
            return None
        message += chunk

    log(f"received message: {message.decode('utf-8')}")
    return json.loads(message.decode("utf-8"))

def send_message(data):
    encoded = json.dumps(data).encode("utf-8")
    stdout_bin.write(struct.pack("<I", len(encoded)))
    stdout_bin.write(encoded)
    stdout_bin.flush()


#download handler -- recieves url and quality from extension
#runs yt-dlp to download both audio and video files
#puts it back to the extension

def download_video(url, quality, download_dir):

    log(f"download_video called: url- {url} quality={quality}")

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
        r"C:\Python314\python.exe", "-m", "yt_dlp",
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
    )

    for line in process.stdout:
        line = line.decode("utf-8", errors="ignore").strip()
        if not line:
            continue

        log(f"yt-dlp line: {line}")

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
    log("main loop started")
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
    try:
        log("grabber host started")
        main()
    except Exception as e:
        log("CRASH: " + str(e))
        import traceback
        log(traceback.format_exc())
