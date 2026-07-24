const express = require('express');
const router = express.Router({ mergeParams: true });
const authenticate = require('../middleware/auth');
const {
  addExpense,
  getExpenses,
  getBalances,
  settleUp,
  editExpense,
  deleteExpense,
  getExpenseSplits
} = require('../controllers/expenseController');

const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

router.use(authenticate);
router.post('/', upload.single('receipt'), addExpense);
router.get('/', getExpenses);
router.get('/:expenseId/splits', getExpenseSplits);
router.put('/:expenseId', editExpense);
router.delete('/:expenseId', deleteExpense);

module.exports = router;