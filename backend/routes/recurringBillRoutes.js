const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { createBill, getBills, deleteBill } = require('../controllers/recurringBillController');

router.use(authenticate);
router.post('/', createBill);
router.get('/', getBills);
router.delete('/:billId', deleteBill);
module.exports = router;
