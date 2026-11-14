const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.post('/:id/reset-password', userController.resetUserPassword);
router.put('/:id/toggle-active', userController.toggleUserActive);
router.get('/technicians', userController.listTechnicians);

module.exports = router;
