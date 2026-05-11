const config = {
  transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || 'groq',
  openaiKey: process.env.OPENAI_API_KEY || '',
  groqKey: process.env.GROQ_API_KEY || '',
};

module.exports = config;
