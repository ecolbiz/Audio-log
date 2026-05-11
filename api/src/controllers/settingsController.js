const config = require('../config');

exports.getSettings = (req, res) => {
  res.json({
    provider: config.transcriptionProvider,
    openaiKeySet: !!config.openaiKey,
    groqKeySet: !!config.groqKey,
  });
};

exports.updateProvider = (req, res) => {
  const { provider } = req.body;
  if (!['openai', 'groq'].includes(provider)) {
    return res.status(400).json({ error: 'Provedor inválido. Use "openai" ou "groq".' });
  }
  config.transcriptionProvider = provider;
  res.json({ provider: config.transcriptionProvider });
};

exports.getOpenAICredits = async (req, res) => {
  if (!config.openaiKey) {
    return res.status(400).json({ error: 'OPENAI_API_KEY não configurada.' });
  }
  try {
    const response = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
      headers: { Authorization: `Bearer ${config.openaiKey}` },
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Erro ao consultar créditos.' });
    }
    res.json({
      total_granted: data.total_granted,
      total_used: data.total_used,
      total_available: data.total_available,
    });
  } catch (err) {
    res.status(502).json({ error: 'Não foi possível conectar à API da OpenAI.' });
  }
};
