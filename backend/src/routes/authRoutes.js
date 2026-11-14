const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { loginLimiter } = require('../middlewares/rateLimiter');

router.post('/login', loginLimiter, authController.login);
router.post('/request-password-reset', authController.requestPasswordReset);

// Protected auth routes
router.use(authenticate);
router.post('/logout', authController.logout);
router.get('/me', authController.me);
router.post('/change-password', authController.changeMandatoryPassword);

module.exports = router;
