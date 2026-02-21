import { Router } from 'express';
import { invoiceController } from '../controllers/invoiceController';

const router = Router();

router.get('/', invoiceController.list);
router.get('/search', invoiceController.search);
router.patch('/:id/payment', invoiceController.recordPayment);
router.delete('/:id/payments/:paymentId', invoiceController.deletePayment);
router.get('/:id', invoiceController.getById);
router.post('/', invoiceController.createFromOrder);

export default router;
