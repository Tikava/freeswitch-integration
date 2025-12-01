import { createStt } from "../yandex/stt.js";
import { log, error } from "../utils/logger.js";

export function bindFreeSwitch(ws) {
  log("🔌 FS connected");

  const stt = createStt(
    (data) => {
      if (data.final) {
        log("🎤 FINAL:", data.final);
        ws.send(JSON.stringify({ type: "final_text", text: data.final }));
      } else if (data.partial) {
        ws.send(JSON.stringify({ type: "partial_text", text: data.partial }));
      }
    },
    () => {
      log("🔁 STT reconnect scheduled...");
    }
  );

  ws.on("message", (msg) => {
    if (Buffer.isBuffer(msg)) {
      stt.send(msg);
    }
  });

  ws.on("close", () => {
    log("❌ FS disconnected");
    stt.close();
  });
}
