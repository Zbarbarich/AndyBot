import { Router } from 'express';
import { customerController } from '../controllers/customerController';

const router = Router();

router.get('/', customerController.getAll);
router.get('/sorted', customerController.listSorted);
router.get('/search', customerController.search);
router.get('/:id/payment-history', customerController.getPaymentHistory);
router.get('/:id/orders', customerController.getCustomerOrders);
router.get('/:id/invoices', customerController.getCustomerInvoices);
router.get('/:id', customerController.getById);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.delete);

export default router;
