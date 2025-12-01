# Async Audio Stream

**Async Audio Stream** defines abstract interfaces for streaming audio data in an asynchronous, format-agnostic way. This is ideal for real-time audio processing pipelines, including transcoding, streaming, and speech recognition workflows.

## Install

```bash
npm install @silyze/async-audio-stream
```

## Usage

Import and use it in your project:

```ts
import { AudioFormat, AudioStream } from "@silyze/async-audio-stream";

// Example: Implement your custom audio format
class MyFormat extends AudioFormat {
  get name() {
    return "my-format";
  }

  get pcmSampleRate() {
    return 48000;
  }

  decode(input: AsyncReadStream<Buffer>): AsyncReadStream<Buffer> {
    // return a PCM stream
    throw new Error("Not implemented");
  }

  encode(input: AsyncReadStream<Buffer>): AsyncReadStream<Buffer> {
    // return an encoded stream
    throw new Error("Not implemented");
  }
}
```

## Interfaces

### `AudioFormat`

Represents an audio encoding format. You must implement:

```ts
abstract class AudioFormat {
  abstract decode(input: AsyncReadStream<Buffer>): AsyncReadStream<Buffer>;
  abstract encode(input: AsyncReadStream<Buffer>): AsyncReadStream<Buffer>;

  abstract get name(): string;
  abstract get pcmSampleRate(): number;
}
```

- `decode()` — Converts from this format to PCM.
- `encode()` — Converts from PCM to this format.
- `name` — Human-readable identifier.
- `pcmSampleRate` — The PCM sample rate used in `decode`/`encode`.

### `AudioOutputStream`

```ts
interface AudioOutputStream extends AsyncReadStream<Buffer> {
  get format(): AudioFormat;
}
```

Represents a readable audio stream with associated format metadata.

### `AudioInputStream`

```ts
interface AudioInputStream extends AsyncWriteStream<Buffer> {
  get format(): AudioFormat;
}
```

Represents a writable audio stream with associated format metadata.

### `AudioStream`

```ts
interface AudioStream extends AudioInputStream, AudioOutputStream {
  get ready(): Promise<void>;
}
```

Bidirectional stream that supports both input and output. Useful for transcoders or duplex pipelines.

- `ready` — A promise that resolves when the stream is ready to use.

### `Transcript`

```ts
interface Transcript {
  source: string;
  content: string;
}
```

Represents a unit of transcription output.

## Implementation Guide

To implement a custom format or stream:

1. **Implement `AudioFormat`** for your codec.
2. **Use `AsyncReadStream` and `AsyncWriteStream`** (from `@mojsoski/async-stream`) for streaming behavior.
3. **Wrap `AudioStream`** if you need to create a full duplex audio processor or transcoder.
