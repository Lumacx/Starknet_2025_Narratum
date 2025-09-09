// 1. We removed 'play' from this import because we are not using it anymore.
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// 2. We import built-in Node.js modules for handling files and streams.
import * as fs from 'fs';
import { pipeline } from 'stream/promises';

import 'dotenv/config';

const elevenlabs = new ElevenLabsClient();

console.log("Requesting audio from ElevenLabs...");

const audio = await elevenlabs.textToSpeech.convert('JBFqnCBsd6RMkjVDRZzb', {
  text: 'The first move is what sets everything in motion.',
  modelId: 'eleven_multilingual_v2',
  outputFormat: 'mp3_44100_128',
});

// 3. This is the new part. Instead of calling play(audio), we create a file
//    and stream the audio data into it.
const fileName = "output.mp3";
console.log(`Streaming audio to file: ${fileName}...`);

await pipeline(audio, fs.createWriteStream(fileName));

console.log(`Audio file created successfully: ${fileName}`);