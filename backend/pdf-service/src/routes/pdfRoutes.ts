import { Router } from 'express';
import { pdfController } from '../controllers/pdfController';

const router = Router();

router.get('/quotes/:id/pdf', pdfController.quotePdf);
router.get('/orders/:id/pdf', pdfController.orderPdf);
router.get('/invoices/:id/pdf', pdfController.invoicePdf);

export default router;
