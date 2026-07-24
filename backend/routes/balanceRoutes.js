const express = require('express');
const router = express.Router({ mergeParams: true });
const authenticate = require('../middleware/auth');
const { getBalances, settleUp } = require('../controllers/expenseController');

router.use(authenticate);

router.get('/', getBalances);        
router.post('/settle', settleUp);   

module.exports = router;
