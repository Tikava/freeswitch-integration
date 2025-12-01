// test-pcm-server.js
import fs from "fs";
import WebSocket, { WebSocketServer } from "ws";
import { Buffer } from "buffer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const PORT = 9000;
const WAV_FILE = "./samples/input.wav";  // <-- клади WAV сюда
const PCM_FILE = "./samples/output.pcm"; // <-- сюда создадим PCM

console.log(`🚀 Test WAV→PCM streamer: ws://0.0.0.0:${PORT}/stream`);

const FRAME = 320; // 20ms @ 8000Hz, s16le mono: 160 samples * 2 bytes

ffmpeg.setFfmpegPath(ffmpegPath);

// -- Convert WAV → PCM before server starts --
async function convertWavToPCM() {
    return new Promise((resolve, reject) => {
        console.log("🎛  Converting WAV → PCM (s16le, 8000Hz, mono)…");

        ffmpeg(WAV_FILE)
            .outputOptions([
                "-acodec pcm_s16le",
                "-ac 1",
                "-ar 8000",
                "-f s16le"
            ])
            .save(PCM_FILE)
            .on("end", () => {
                console.log("✅ WAV→PCM conversion done.");
                resolve(true);
            })
            .on("error", (err) => {
                console.error("❌ Conversion error:", err);
                reject(err);
            });
    });
}

function sendPCM(ws, chunk) {
    ws.send(chunk);
}

async function startServer() {
    await convertWavToPCM();

    const pcm = fs.readFileSync(PCM_FILE);
    console.log(`🎵 Loaded PCM, size=${pcm.length} bytes`);

    const wss = new WebSocketServer({ port: PORT });

    wss.on("connection", (ws) => {
        console.log("🔌 FS connected");

        let offset = 0;

        const timer = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                clearInterval(timer);
                return;
            }

            if (offset >= pcm.length) {
                console.log("🏁 Playback finished");
                clearInterval(timer);
                return;
            }

            const chunk = pcm.slice(offset, offset + FRAME);
            offset += FRAME;

            console.log("🔊 sending PCM chunk:", chunk.length);
            sendPCM(ws, chunk);
        }, 20); // 20ms chunks → имитация реального RTP

        ws.on("close", () => console.log("❌ FS disconnected"));
    });
}

startServer();
