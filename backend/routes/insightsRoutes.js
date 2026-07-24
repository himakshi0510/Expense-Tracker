const express = require('express');
const router = express.Router({ mergeParams: true });
const authenticate = require('../middleware/auth');
const { getInsights } = require('../controllers/insightsController');

router.use(authenticate);

router.get('/', getInsights); 

module.exports = router;
