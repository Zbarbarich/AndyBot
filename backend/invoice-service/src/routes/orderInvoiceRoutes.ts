import { Router } from 'express';
import { invoiceController } from '../controllers/invoiceController';

const router = Router();

router.get('/:orderId/invoices', invoiceController.getByOrderId);
router.post('/:orderId/invoices', invoiceController.createFromOrder);

export default router;
