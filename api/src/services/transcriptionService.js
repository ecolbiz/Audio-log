const fs = require('fs');
const OpenAI = require('openai');
const Groq = require('groq-sdk');
const config = require('../config');

async function transcribeAudio(filePath) {
  const buffer = fs.readFileSync(filePath);
  const file = await OpenAI.toFile(buffer, 'audio.m4a', { type: 'audio/m4a' });

  if (config.transcriptionProvider === 'openai') {
    const client = new OpenAI({ apiKey: config.openaiKey });
    return client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'text',
    });
  }

  const client = new Groq({ apiKey: config.groqKey });
  return client.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    language: 'pt',
    response_format: 'text',
  });
}

function parseStructuredText(transcript) {
  const get = (label) => {
    const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:DATA|CLIENTE|MEIO|ASSUNTO):|$)`, 'i');
    const match = transcript.match(regex);
    return match ? match[1].trim() : null;
  };

  return {
    extractedDate: get('DATA'),
    extractedClient: get('CLIENTE'),
    extractedMedium: get('MEIO'),
    extractedSubject: get('ASSUNTO'),
  };
}

module.exports = { transcribeAudio, parseStructuredText };
