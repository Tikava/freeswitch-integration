import WebSocket, { WebSocketServer } from "ws";
import { createSttStream } from "./stt/stt-client.js";
import { streamTts } from "./tts/tts-client.js";
import { Buffer } from "buffer";
import { pcm16ToUlaw } from "./ulaw.js";


const PORT = 9000;
const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 WebSocket server started: ws://0.0.0.0:${PORT}/stream`);

function sendPcmToFS(ws, pcmChunk) {
  const b64 = Buffer.from(pcmChunk).toString("base64");

  const jsonMsg = {
    type: "streamAudio",
    data: {
      audioDataType: "base64",
      sampleRate: 8000,
      audioData: b64
    }
  };

  ws.send(JSON.stringify(jsonMsg));
}


function sendAudioJson(ws, pcm16) {
  const base64 = Buffer.from(pcm16).toString("base64");

  const msg = {
    type: "streamAudio",
    data: {
      audioDataType: "raw",   // ← обязательно raw
      sampleRate: 8000,       // ← модуль использует .r8
      audioData: base64       // ← base64 PCM16
    }
  };

  ws.send(JSON.stringify(msg));
}



function sendAudioULaw(ws, pcm16) {
  try {
    const ulaw = pcm16ToUlaw(pcm16);

    const jsonMsg = {
      type: "streamAudio",
      data: {
        audioDataType: "ulaw",
        sampleRate: 8000,
        audioData: ulaw.toString("base64"),
      },
    };

    ws.send(JSON.stringify(jsonMsg));
  } catch (err) {
    console.error("🔥 µ-law encode error:", err);
  }
}


wss.on("connection", async (ws) => {
  console.log("🔌 FS connected to WS");

  let sttStream;

  // Инициализация STT
  try {
    sttStream = await createSttStream(
      // FINAL текст
      async ({ text }) => {
        if (!text) return;

        console.log("🗣 Пользователь:", text);

        const reply = `Вы сказали: ${text}`;
        console.log("🔊 TTS:", reply);

        try {
          await streamTts("текст", (ulawFrame) => {
            ws.send(JSON.stringify({
              type: "streamAudio",
              data: {
                audioDataType: "raw",
                sampleRate: 8000,
                audioData: ulawFrame.toString("base64")
              }
            }));
          });

        } catch (err) {
          console.error("🔥 Ошибка TTS:", err);
        }
      },

      // PARTIAL текст
      (partial) => {
        if (partial) console.log("⌛ PARTIAL:", partial);
      }
    );
  } catch (err) {
    console.error("❌ STT init failed:", err);
    ws.close();
    return;
  }

  // Входящие RTP → в STT
  ws.on("message", (message, isBinary) => {
    const audio = isBinary ? message : Buffer.from(message);

    if (sttStream) {
      sttStream.write({
        chunk: { data: audio },
      });
    }
  });

  ws.on("close", () => {
    console.log("❌ FS disconnected");
    sttStream?.end();
  });

  ws.on("error", (err) => {
    console.error("⚠ WS error:", err);
    sttStream?.end();
  });
});
