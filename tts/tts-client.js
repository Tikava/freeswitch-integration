import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateIamToken } from "../iam/iam.js";
import { pcm16ToUlaw } from "../ulaw.js";   // <<<<<<<<<<

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageDef = protoLoader.loadSync(
    [
        path.join(__dirname, "protos/yandex/cloud/ai/tts/v3/tts_service.proto"),
        path.join(__dirname, "protos/yandex/cloud/ai/tts/v3/tts.proto"),
    ],
    {
        includeDirs: [
            path.join(__dirname, "protos"),
            path.join(__dirname, "protos/yandex/cloud/ai/tts/v3")
        ],
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    }
);

const proto = grpc.loadPackageDefinition(packageDef);
const Synthesizer = proto.speechkit.tts.v3.Synthesizer;

const ENDPOINT = "tts.api.cloud.yandex.net:443";

export async function streamTts(text, onAudioFrame) {
    const iamToken = await generateIamToken();
    const metadata = new grpc.Metadata();
    metadata.add("authorization", `Bearer ${iamToken}`);

    const client = new Synthesizer(ENDPOINT, grpc.credentials.createSsl());
    const stream = client.streamSynthesis(metadata);

    // Dump local PCM
    const dumpDir = path.join(__dirname, "../output");
    if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir);

    const dumpFile = path.join(dumpDir, `tts_dump_${Date.now()}.pcm`);
    const dumpStream = fs.createWriteStream(dumpFile);
    console.log("📁 TTS dump file:", dumpFile);

    // ---- OPTIONS ----
    stream.write({
        options: {
            voice: "alena",
            speed: 1.0,
            pitch_shift: 0,
            volume: 0.7,
            loudness_normalization_type: "MAX_PEAK",
            output_audio_spec: {
                raw_audio: {
                    audio_encoding: "LINEAR16_PCM",
                    sample_rate_hertz: 8000
                }
            }
        }
    });

    // ---- TEXT ----
    stream.write({ synthesis_input: { text } });

    // ---- START ----
    stream.write({ force_synthesis: {} });

    // ---- AUDIO HANDLER ----
    stream.on("data", (resp) => {
        if (resp.audio_chunk?.data) {
            const pcm = resp.audio_chunk.data;

            // сохраняем оригинальный PCM
            dumpStream.write(pcm);

            // режем на фреймы PCM16 (320 байт)
            for (let i = 0; i < pcm.length; i += 320) {
                const framePcm = pcm.subarray(i, i + 320);
                if (framePcm.length !== 320) continue;

                // >>> конвертация PCM16 → µ-law <<<
                const frameUlaw = pcm16ToUlaw(framePcm);  // 160 байт

                // отдаём наружу FS-ready frame
                onAudioFrame(frameUlaw);
            }
        }

        if (resp.text_chunk?.text) {
            console.log("💬 TTS text:", resp.text_chunk.text);
        }
    });

    stream.on("end", () => {
        console.log("🔕 TTS stream ended");
        dumpStream.end();
    });

    stream.on("error", (err) => {
        console.error("🔥 TTS error:", err);
        dumpStream.end();
    });

    return stream;
}
