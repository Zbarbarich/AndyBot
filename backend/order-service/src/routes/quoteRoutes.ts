import { Router } from 'express';
import { quoteOrderController } from '../controllers/quoteOrderController';

const router = Router();

router.get('/', quoteOrderController.listQuotes);
router.get('/:id', quoteOrderController.getQuoteById);
router.post('/', quoteOrderController.createQuote);
router.put('/:id', quoteOrderController.updateQuote);
router.delete('/:id', quoteOrderController.deleteQuote);
router.post('/:id/convert-to-order', quoteOrderController.convertToOrder);

export default router;
