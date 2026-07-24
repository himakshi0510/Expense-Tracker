const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  createGroup,
  joinGroup,
  getMyGroups,
  getGroupById,
  leaveGroup
} = require('../controllers/groupController');

router.use(authenticate); 

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/', getMyGroups);
router.get('/:id', getGroupById);
router.post('/:id/leave', leaveGroup);

module.exports = router;