import { AsyncReadStream, AsyncWriteStream } from "@mojsoski/async-stream";

export abstract class AudioFormat {
  abstract decode(input: AsyncReadStream<Buffer>): AsyncReadStream<Buffer>;
  abstract encode(input: AsyncReadStream<Buffer>): AsyncReadStream<Buffer>;

  abstract get name(): string;
  abstract get pcmSampleRate(): number;
}

export interface AudioOutputStream extends AsyncReadStream<Buffer> {
  get format(): AudioFormat;
}

export interface AudioInputStream extends AsyncWriteStream<Buffer> {
  get format(): AudioFormat;
}

export interface AudioStream extends AudioInputStream, AudioOutputStream {
  get ready(): Promise<void>;
}

export interface Transcript {
  source: string;
  content: string;
}
