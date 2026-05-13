const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

const SELECT = { id: true, name: true, email: true, role: true, createdAt: true };
const KS_INCLUDE = { keywordSets: { include: { keywordSet: { select: { id: true, name: true } } } } };

exports.list = async (req, res) => {
  const users = await prisma.user.findMany({
    select: { ...SELECT, ...KS_INCLUDE },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
};

exports.setKeywordSets = async (req, res) => {
  const { id } = req.params;
  const { keywordSetIds = [] } = req.body;
  await prisma.userKeywordSet.deleteMany({ where: { userId: id } });
  if (keywordSetIds.length) {
    await prisma.userKeywordSet.createMany({
      data: keywordSetIds.map((ksId) => ({ userId: id, keywordSetId: ksId })),
    });
  }
  const rows = await prisma.userKeywordSet.findMany({
    where: { userId: id },
    include: { keywordSet: { select: { id: true, name: true } } },
  });
  res.json(rows.map((r) => r.keywordSet));
};

exports.create = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(400).json({ error: 'E-mail já cadastrado.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role === 'ADMIN' ? 'ADMIN' : 'USER' },
    select: SELECT,
  });
  res.status(201).json(user);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password } = req.body;
  const data = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (role && ['USER', 'ADMIN'].includes(role)) data.role = role;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({ where: { id }, data, select: SELECT });
  res.json(user);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: 'Não é possível remover sua própria conta.' });
  await prisma.user.delete({ where: { id } });
  res.status(204).send();
};
