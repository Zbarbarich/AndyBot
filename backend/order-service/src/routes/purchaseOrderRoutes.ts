import { Router } from 'express';
import { purchaseOrderController } from '../controllers/purchaseOrderController';

const router = Router();

router.get('/search', purchaseOrderController.search);
router.get('/', purchaseOrderController.list);
router.get('/:id', purchaseOrderController.getById);
router.patch('/:id/lines/:lineId/received', purchaseOrderController.updateLineReceived);
router.patch('/:id/lines/:lineId', purchaseOrderController.updateLineOrdered);
router.patch('/:id/close', purchaseOrderController.close);
router.patch('/:id/cancel', purchaseOrderController.cancel);

export default router;
