import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import { generateIamToken } from "../iam/iam.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageDef = protoLoader.loadSync(
    [
        path.join(__dirname, "protos/yandex/cloud/ai/stt/v3/stt-service.proto"),
        path.join(__dirname, "protos/yandex/cloud/ai/stt/v3/stt.proto")
    ],
    {
        includeDirs: [
            path.join(__dirname, "protos"),                       
            path.join(__dirname, "protos/yandex/cloud/ai/stt/v3"), // stt.proto / stt-service.proto
        ],
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    }
);


const proto = grpc.loadPackageDefinition(packageDef);
const Recognizer = proto.speechkit.stt.v3.Recognizer;

const ENDPOINT = "stt.api.cloud.yandex.net:443";

export async function createSttStream(onResult) {
    const iamToken = await generateIamToken();
    const metadata = new grpc.Metadata();
    metadata.add("authorization", `Bearer ${iamToken}`);

    const client = new Recognizer(ENDPOINT, grpc.credentials.createSsl());

    const stream = client.RecognizeStreaming(metadata);

    const firstMessage = {
        session_options: {
            recognition_model: {
                model: "general",
                audio_format: {
                    raw_audio: {
                        audio_encoding: "AUDIO_ENCODING_LINEAR16_PCM",
                        sample_rate_hertz: 8000,
                        audio_channel_count: 1
                    }
                },
                text_normalization: {
                    text_normalization: "TEXT_NORMALIZATION_ENABLED",
                    profanity_filter: true,
                    literature_text: false
                },
                language_restriction: {
                    restriction_type: "WHITELIST",
                    language_code: ["ru-RU"]
                },
                audio_processing_type: "REAL_TIME"
            }
        }
    };



    console.log("Sending first message:", JSON.stringify(firstMessage, null, 2));
    stream.write(firstMessage);

    stream.on("data", (data) => {
        // partial (не окончательное)
        if (data.partial?.alternatives?.length) {
            const partial = data.partial.alternatives[0].text.trim();
            if (partial) console.log("⌛ partial:", partial);
            return;
        }

        // final (fallback)
        if (data.final?.alternatives?.length) {
            const phrase = data.final.alternatives[0].text.trim();
            if (phrase) {
                console.log("🗣️ Пользователь сказал:", phrase);
                onResult({ type: "utterance", text: phrase, final: true });
            }
            return;
        }

        // final_refinement (основной вариант)
        if (data.final_refinement?.normalized_text?.alternatives?.length) {
            const phrase = data.final_refinement.normalized_text.alternatives[0].text.trim();
            if (phrase) {
                console.log("🗣️ Пользователь сказал:", phrase);
                onResult({ type: "utterance", text: phrase, final: true });
            }
            return;
        }
    });




    stream.on("error", (err) => {
        console.error("STT error", err);
    });
    stream.on("end", () => {
        console.log("STT stream ended");
    });

    return stream;
}
