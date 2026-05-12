const prisma = require('../utils/prisma');
const { normalizeFields } = require('../services/normalizationService');
const { dispatch: webhookDispatch } = require('../services/webhookService');

const INCLUDE = {
  keywordSet: true,
  auditedBy: { select: { name: true } },
};

function parseWithKeywords(text, keywordDefs) {
  const result = {};
  const upper = text.toUpperCase();
  const parseable = keywordDefs.filter((k) => k.type !== 'Dropdown');
  const names = parseable.map((k) => k.name);
  for (const kw of names) {
    const start = upper.indexOf(kw);
    if (start === -1) continue;
    let end = text.length;
    for (const other of names) {
      if (other === kw) continue;
      const pos = upper.indexOf(other, start + kw.length);
      if (pos !== -1 && pos < end) end = pos;
    }
    result[kw] = text.slice(start + kw.length, end).trim();
  }
  return result;
}

exports.get = async (req, res) => {
  const { id } = req.params;
  const audio = await prisma.audio.findUnique({
    where: { id },
    include: { transcription: { include: INCLUDE } },
  });
  if (!audio || audio.userId !== req.user.id) {
    return res.status(404).json({ error: 'Áudio não encontrado.' });
  }
  res.json(audio.transcription);
};

exports.apply = async (req, res) => {
  const { id } = req.params;
  const { keywordSetId } = req.body;

  const audio = await prisma.audio.findUnique({
    where: { id },
    include: { transcription: true },
  });
  if (!audio || audio.userId !== req.user.id) {
    return res.status(404).json({ error: 'Áudio não encontrado.' });
  }

  if (audio.transcription?.auditedAt) {
    return res.status(400).json({ error: 'Transcrição já auditada.' });
  }

  const fullText = audio.transcription?.fullText || audio.transcriptRaw || '';
  let fields = {};

  if (keywordSetId) {
    const ks = await prisma.keywordSet.findUnique({ where: { id: keywordSetId } });
    if (ks) fields = parseWithKeywords(fullText, ks.keywords);
  }

  const transcription = await prisma.transcription.upsert({
    where: { audioId: id },
    create: { audioId: id, fullText, fields, keywordSetId: keywordSetId || null },
    update: { fields, keywordSetId: keywordSetId || null },
    include: INCLUDE,
  });

  res.json(transcription);
};

exports.audit = async (req, res) => {
  const { id } = req.params;
  const audio = await prisma.audio.findUnique({ where: { id } });
  if (!audio || audio.userId !== req.user.id) {
    return res.status(404).json({ error: 'Áudio não encontrado.' });
  }
  const transcription = await prisma.transcription.update({
    where: { audioId: id },
    data: { auditedAt: new Date(), auditedByUserId: req.user.id },
    include: INCLUDE,
  });
  res.json(transcription);
};

exports.unaudit = async (req, res) => {
  const { id } = req.params;
  const audio = await prisma.audio.findUnique({ where: { id } });
  if (!audio || audio.userId !== req.user.id) {
    return res.status(404).json({ error: 'Áudio não encontrado.' });
  }
  const transcription = await prisma.transcription.update({
    where: { audioId: id },
    data: { auditedAt: null, auditedByUserId: null },
    include: INCLUDE,
  });
  res.json(transcription);
};

exports.normalize = async (req, res) => {
  const { id } = req.params;
  const audio = await prisma.audio.findUnique({
    where: { id },
    include: { transcription: { include: { keywordSet: true } } },
  });
  if (!audio || audio.userId !== req.user.id) {
    return res.status(404).json({ error: 'Áudio não encontrado.' });
  }
  const t = audio.transcription;
  if (!t) return res.status(400).json({ error: 'Sem transcrição.' });
  if (t.auditedAt) return res.status(400).json({ error: 'Transcrição já auditada.' });

  const keywords =
    t.keywordSet?.keywords ||
    Object.keys(t.fields || {}).map((k) => ({ name: k, type: 'String' }));

  const normalized = await normalizeFields(t.fullText, t.fields || {}, keywords);

  const updated = await prisma.transcription.update({
    where: { audioId: id },
    data: { fields: normalized },
    include: INCLUDE,
  });
  res.json(updated);
};

exports.dispatch = async (req, res) => {
  const { id } = req.params;
  const audio = await prisma.audio.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      transcription: {
        include: {
          keywordSet: true,
          auditedBy: { select: { name: true } },
        },
      },
    },
  });
  if (!audio || audio.userId !== req.user.id) {
    return res.status(404).json({ error: 'Áudio não encontrado.' });
  }
  const t = audio.transcription;
  if (!t) return res.status(400).json({ error: 'Sem transcrição.' });

  const webhook = t.keywordSet?.webhook;
  if (!webhook?.url) return res.status(400).json({ error: 'Nenhum webhook configurado para este CPC.' });

  try {
    const result = await webhookDispatch(webhook, t, audio);
    res.json({ ok: result.ok, status: result.status, body: result.body });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { fields, keywordSetId } = req.body;

  const audio = await prisma.audio.findUnique({ where: { id } });
  if (!audio || audio.userId !== req.user.id) {
    return res.status(404).json({ error: 'Áudio não encontrado.' });
  }

  const transcription = await prisma.transcription.upsert({
    where: { audioId: id },
    create: {
      audioId: id,
      fullText: audio.transcriptRaw || '',
      fields: fields || {},
      keywordSetId: keywordSetId || null,
    },
    update: {
      ...(fields !== undefined && { fields }),
      ...(keywordSetId !== undefined && { keywordSetId: keywordSetId || null }),
    },
    include: INCLUDE,
  });

  res.json(transcription);
};
