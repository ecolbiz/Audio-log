const express = require('express');
const multer = require('multer');
const auth = require('../middlewares/auth');
const authController = require('../controllers/authController');
const audioController = require('../controllers/audioController');
const settingsController = require('../controllers/settingsController');
const keywordSetController = require('../controllers/keywordSetController');
const transcriptionController = require('../controllers/transcriptionController');

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', auth, authController.me);

router.post('/audios', auth, upload.single('audio'), audioController.uploadAudio);
router.get('/audios/mine', auth, audioController.listMine);
router.delete('/audios/:id', auth, audioController.deleteMine);

router.get('/admin/audios', auth, audioController.searchAll);
router.patch('/admin/audios/:id', auth, audioController.updateStructured);

router.get('/keyword-sets', auth, keywordSetController.list);
router.post('/keyword-sets', auth, keywordSetController.create);
router.patch('/keyword-sets/:id', auth, keywordSetController.update);
router.delete('/keyword-sets/:id', auth, keywordSetController.remove);

router.get('/audios/:id/transcription', auth, transcriptionController.get);
router.post('/audios/:id/transcription/apply', auth, transcriptionController.apply);
router.patch('/audios/:id/transcription', auth, transcriptionController.update);
router.post('/audios/:id/transcription/audit', auth, transcriptionController.audit);
router.delete('/audios/:id/transcription/audit', auth, transcriptionController.unaudit);
router.post('/audios/:id/transcription/normalize', auth, transcriptionController.normalize);

router.get('/settings', auth, settingsController.getSettings);
router.patch('/settings/provider', auth, settingsController.updateProvider);
router.get('/settings/openai-credits', auth, settingsController.getOpenAICredits);

module.exports = router;
