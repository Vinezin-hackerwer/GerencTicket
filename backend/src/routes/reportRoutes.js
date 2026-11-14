const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', reportController.getReports);

module.exports = router;
