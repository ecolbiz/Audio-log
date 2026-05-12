const Groq = require('groq-sdk');
const OpenAI = require('openai');
const config = require('../config');

const FORMAT_HINTS = {
  Date: 'DD/MM/YYYY',
  Time: 'HH:MM (24h, zero-padded)',
  Datetime: 'DD/MM/YYYY HH:MM',
  Integer: 'integer number (digits only)',
  Decimal: 'decimal number (digits, dot as separator)',
  String: 'plain text',
};

async function normalizeFields(fullText, currentFields, keywords) {
  if (!keywords || keywords.length === 0) return currentFields;

  const normalizable = keywords.filter((kw) => {
    const type = typeof kw === 'string' ? 'String' : kw.type;
    return type !== 'Dropdown';
  });
  if (normalizable.length === 0) return currentFields;

  const fieldDescriptions = normalizable
    .map((kw) => {
      const name = typeof kw === 'string' ? kw : kw.name;
      const type = typeof kw === 'string' ? 'String' : kw.type;
      const decimals = kw.decimals ?? 2;
      const fmt =
        type === 'Decimal'
          ? `decimal with ${decimals} decimal places, dot separator`
          : (kw.mask ? `format: ${kw.mask}` : FORMAT_HINTS[type] || 'plain text');
      const current = currentFields[name] ?? '';
      return `- ${name} (${type}, format: ${fmt}): current value = "${current}"`;
    })
    .join('\n');

  const prompt = `You are a data normalization assistant. Given a transcription and extracted field values, normalize each field to match its expected format. Use the transcription as context to interpret ambiguous values.

Transcription:
"""
${fullText}
"""

Fields to normalize:
${fieldDescriptions}

Rules:
- Time: "6 horas" → "06:00", "6 e meia" → "06:30", "meio-dia" → "12:00"
- Date: use DD/MM/YYYY
- Decimal/Integer: convert written numbers to digits; "vinte e cinco reais e cinquenta centavos" → "25.50"
- String: clean up but preserve meaning
- If a value is empty or cannot be determined, return ""

Return ONLY a flat JSON object mapping each field name to its normalized value string.`;

  let raw;
  if (config.transcriptionProvider === 'openai') {
    const client = new OpenAI({ apiKey: config.openaiKey });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });
    raw = JSON.parse(completion.choices[0].message.content);
  } else {
    const client = new Groq({ apiKey: config.groqKey });
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });
    raw = JSON.parse(completion.choices[0].message.content);
  }

  const merged = { ...currentFields };
  for (const kw of normalizable) {
    const name = typeof kw === 'string' ? kw : kw.name;
    if (raw[name] !== undefined) merged[name] = String(raw[name]);
  }
  return merged;
}

module.exports = { normalizeFields };
