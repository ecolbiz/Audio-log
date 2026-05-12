module.exports = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  next();
};
