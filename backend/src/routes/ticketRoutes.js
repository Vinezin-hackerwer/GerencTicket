const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

router.use(authenticate);

// List tickets
router.get('/new', ticketController.listNewTickets);
router.get('/my', ticketController.listMyTickets);

// Ticket creation
router.post('/', ticketController.createTicket);

// Single ticket operations
router.get('/:id', ticketController.getTicketById);
router.post('/:id/claim', ticketController.claimTicket);
router.put('/:id/status', ticketController.updateStatus);
router.put('/:id/reassign', requireRole('admin'), ticketController.reassignTicket);
router.delete('/:id', requireRole('admin'), ticketController.deleteTicket);

// Comments for tickets
router.get('/:ticketId/comments', commentController.getTicketComments);
router.post('/:ticketId/comments', commentController.addComment);

module.exports = router;
