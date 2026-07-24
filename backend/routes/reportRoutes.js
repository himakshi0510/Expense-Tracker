const express = require('express');
const router = express.Router({ mergeParams: true });
const authenticate = require('../middleware/auth');
const { generateGroupReport } = require('../controllers/reportController');

router.use(authenticate);
router.get('/', generateGroupReport);

module.exports = router;
