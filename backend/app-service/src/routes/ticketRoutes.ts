import { Router } from 'express';
import { ticketController } from '../controllers/ticketController';

const router = Router();

router.get('/', ticketController.getAll);
router.get('/sorted', ticketController.listSorted);
router.get('/by-category', ticketController.filterByCategory);
router.get('/by-priority', ticketController.filterByPriority);
router.get('/by-customer', ticketController.filterByCustomer);
router.get('/:id', ticketController.getById);
router.get('/:id/images/:imageId', ticketController.getImage);
router.post('/', ticketController.create);
router.put('/:id', ticketController.update);
router.delete('/:id', ticketController.delete);
router.post('/:id/resolutions', ticketController.addResolution);
router.post('/:id/close', ticketController.closeTicket);
router.post('/:id/images', ticketController.addImage);
router.delete('/:id/images/:imageId', ticketController.deleteImage);

export default router;
