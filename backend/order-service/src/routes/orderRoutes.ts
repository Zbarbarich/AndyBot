import { Router } from 'express';
import { quoteOrderController } from '../controllers/quoteOrderController';
import { purchaseOrderController } from '../controllers/purchaseOrderController';
import { depositController } from '../controllers/depositController';

const router = Router();

router.get('/', quoteOrderController.listOrders);
router.get('/search', quoteOrderController.search);
router.get('/deposits/held', depositController.listUnapplied);
router.patch('/:orderId/lines/:lineId', quoteOrderController.patchLineBillingStatus);
router.get('/:orderId/deposits', depositController.list);
router.post('/:orderId/deposits', depositController.create);
router.delete('/:orderId/deposits/:depositId', depositController.delete);
router.post('/:orderId/purchase-orders', purchaseOrderController.createForOrder);
router.get('/:id', quoteOrderController.getOrderById);
router.post('/', quoteOrderController.createOrder);
router.put('/:id', quoteOrderController.updateOrder);
router.delete('/:id', quoteOrderController.deleteOrder);

export default router;
