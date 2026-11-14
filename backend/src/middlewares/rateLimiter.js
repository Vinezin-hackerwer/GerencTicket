const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de login a partir deste IP. Tente novamente após 15 minutos.'
  }
});

module.exports = {
  loginLimiter
};
