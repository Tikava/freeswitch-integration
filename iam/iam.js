// stt/iam.js
import fs from "fs";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

const KEY_PATH = "authorized_key.json";

export async function generateIamToken() {
    const data = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));

    const privateKey = data.private_key;
    const keyId = data.id;
    const serviceAccountId = data.service_account_id;

    // JWT
    const now = Math.floor(Date.now() / 1000);

    const jwtPayload = {
        aud: "https://iam.api.cloud.yandex.net/iam/v1/tokens",
        iss: serviceAccountId,
        iat: now,
        exp: now + 3600
    };

    const jwtToken = jwt.sign(jwtPayload, privateKey, {
        algorithm: "PS256",
        keyid: keyId
    });

    // Exchange JWT → IAM token
    const res = await fetch(
        "https://iam.api.cloud.yandex.net/iam/v1/tokens",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jwt: jwtToken })
        }
    );

    const json = await res.json();

    if (!json.iamToken) {
        throw new Error("IAM token fetch failed: " + JSON.stringify(json));
    }

    return json.iamToken;
}
