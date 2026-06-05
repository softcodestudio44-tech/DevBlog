const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiChat, explainCode, summarizeArticle, helpWrite } = require('../controllers/aiController');

router.post('/chat', protect, aiChat);
router.post('/explain', protect, explainCode);
router.post('/summarize', protect, summarizeArticle);
router.post('/write', protect, helpWrite);

module.exports = router;