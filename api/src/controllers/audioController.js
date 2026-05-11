const prisma = require('../utils/prisma');
const { transcribeAudio, parseStructuredText } = require('../services/transcriptionService');

exports.uploadAudio = async (req, res) => {
  const audio = await prisma.audio.create({
    data: { userId: req.user.id, filePath: req.file.path }
  });

  prisma.auditLog.create({
    data: { actorUserId: req.user.id, audioId: audio.id, action: 'CREATE', newValue: { filePath: req.file.path } }
  }).catch(() => null);

  (async () => {
    try {
      const transcriptRaw = await transcribeAudio(req.file.path);
      const structured = parseStructuredText(transcriptRaw);
      await prisma.audio.update({ where: { id: audio.id }, data: { ...structured, transcriptRaw, status: 'TRANSCRIBED' } });
      await prisma.transcription.upsert({
        where: { audioId: audio.id },
        create: { audioId: audio.id, fullText: transcriptRaw, fields: {} },
        update: { fullText: transcriptRaw },
      });
    } catch (err) {
      console.error('[transcription error]', err?.message ?? err);
      await prisma.audio.update({ where: { id: audio.id }, data: { status: 'FAILED' } });
    }
  })();

  res.status(201).json(audio);
};

exports.listMine = async (req, res) => {
  const audios = await prisma.audio.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { transcription: { select: { auditedAt: true } } },
  });
  res.json(audios);
};

exports.deleteMine = async (req, res) => {
  const { id } = req.params;
  const audio = await prisma.audio.findUnique({ where: { id } });
  if (!audio || audio.userId !== req.user.id) return res.status(404).json({ error: 'Áudio não encontrado' });

  await prisma.audio.delete({ where: { id } });
  res.status(204).send();
};

exports.searchAll = async (req, res) => {
  const { q = '' } = req.query;
  const audios = await prisma.audio.findMany({
    where: {
      OR: [
        { extractedClient: { contains: q, mode: 'insensitive' } },
        { extractedSubject: { contains: q, mode: 'insensitive' } },
        { extractedMedium: { contains: q, mode: 'insensitive' } }
      ]
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(audios);
};

exports.updateStructured = async (req, res) => {
  const { id } = req.params;
  const patch = req.body;
  const old = await prisma.audio.findUnique({ where: { id } });
  if (!old) return res.status(404).json({ error: 'Áudio não encontrado' });

  const updated = await prisma.audio.update({ where: { id }, data: patch });
  await prisma.auditLog.create({ data: { actorUserId: req.user.id, audioId: id, action: 'UPDATE_STRUCTURED_FIELDS', oldValue: old, newValue: patch } });
  res.json(updated);
};
