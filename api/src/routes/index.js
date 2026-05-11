const express = require('express');
const multer = require('multer');
const auth = require('../middlewares/auth');
const authController = require('../controllers/authController');
const audioController = require('../controllers/audioController');
const settingsController = require('../controllers/settingsController');

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

router.get('/settings', auth, settingsController.getSettings);
router.patch('/settings/provider', auth, settingsController.updateProvider);
router.get('/settings/openai-credits', auth, settingsController.getOpenAICredits);

module.exports = router;
