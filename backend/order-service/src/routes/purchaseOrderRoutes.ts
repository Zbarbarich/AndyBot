import { Router } from 'express';
import { purchaseOrderController } from '../controllers/purchaseOrderController';

const router = Router();

router.get('/', purchaseOrderController.list);
router.get('/:id', purchaseOrderController.getById);
router.patch('/:id/lines/:lineId', purchaseOrderController.updateLineOrdered);
router.patch('/:id/close', purchaseOrderController.close);

export default router;
