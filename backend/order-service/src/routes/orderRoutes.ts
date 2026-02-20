import { Router } from 'express';
import { quoteOrderController } from '../controllers/quoteOrderController';

const router = Router();

router.get('/', quoteOrderController.listOrders);
router.get('/search', quoteOrderController.search);
router.patch('/:orderId/lines/:lineId', quoteOrderController.patchLineBillingStatus);
router.get('/:id', quoteOrderController.getOrderById);
router.post('/', quoteOrderController.createOrder);
router.put('/:id', quoteOrderController.updateOrder);
router.delete('/:id', quoteOrderController.deleteOrder);

export default router;
