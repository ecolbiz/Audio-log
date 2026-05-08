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
    extractedSubject: get('ASSUNTO')
  };
}

async function transcribeAudio(filePath) {
  return `DATA: 08 maio 2026\nCLIENTE: Exemplo\nMEIO: meeting\nASSUNTO: Transcrição mock para ${filePath}`;
}

module.exports = { transcribeAudio, parseStructuredText };
