// ulaw.js

// µ-law params
const MULAW_BIAS = 0x84;
const CLIP = 32635;

// Convert one 16-bit sample → µ-law byte
function linearToMulaw(sample) {
  let sign = (sample >> 8) & 0x80;
  if (sign !== 0) sample = -sample;
  if (sample > CLIP) sample = CLIP;

  sample += MULAW_BIAS;

  let exponent = 7;
  for (let expMask = 0x4000; (sample & expMask) === 0; expMask >>= 1) {
    exponent--;
  }

  let mantissa = (sample >> (exponent + 3)) & 0x0F;
  let ulaw = ~(sign | (exponent << 4) | mantissa);

  return ulaw & 0xFF;
}

// Convert PCM16 buffer → µ-law buffer
export function pcm16ToUlaw(pcmBuf) {
  const out = Buffer.alloc(pcmBuf.length / 2);

  for (let i = 0, j = 0; i < pcmBuf.length; i += 2, j++) {
    const sample = pcmBuf.readInt16LE(i);
    out[j] = linearToMulaw(sample);
  }

  return out;
}
