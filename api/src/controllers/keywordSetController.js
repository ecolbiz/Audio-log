const prisma = require('../utils/prisma');

const VALID_TYPES = ['String', 'Integer', 'Decimal', 'Date', 'Time', 'Datetime'];

function validateKeywords(keywords) {
  if (!Array.isArray(keywords) || keywords.length === 0) return false;
  return keywords.every(
    (k) => k.name && typeof k.name === 'string' && VALID_TYPES.includes(k.type)
  );
}

function normalizeKeywords(keywords) {
  return keywords.map((k) => ({
    name: k.name.trim().toUpperCase(),
    type: k.type,
    ...(k.type === 'Decimal' ? { decimals: Number(k.decimals ?? 2) } : {}),
  }));
}

exports.list = async (req, res) => {
  const sets = await prisma.keywordSet.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(sets);
};

exports.create = async (req, res) => {
  const { name, keywords } = req.body;
  if (!name || !validateKeywords(keywords)) {
    return res.status(400).json({ error: 'Nome e ao menos uma palavra-chave com tipo são obrigatórios.' });
  }
  const set = await prisma.keywordSet.create({
    data: { name, keywords: normalizeKeywords(keywords) },
  });
  res.status(201).json(set);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, keywords } = req.body;
  const data = {};
  if (name) data.name = name;
  if (Array.isArray(keywords)) {
    if (!validateKeywords(keywords)) {
      return res.status(400).json({ error: 'Palavras-chave inválidas.' });
    }
    data.keywords = normalizeKeywords(keywords);
  }
  const set = await prisma.keywordSet.update({ where: { id }, data });
  res.json(set);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await prisma.keywordSet.delete({ where: { id } });
  res.status(204).send();
};
