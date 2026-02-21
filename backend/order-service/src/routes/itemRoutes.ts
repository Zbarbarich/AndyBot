import { Router } from 'express';
import { itemController } from '../controllers/itemController';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// Global search can call /search; allow any authenticated user (gateway verifies JWT).
router.get('/search', itemController.search);

router.use(requireAdmin);

router.get('/', itemController.getAll);
router.get('/:id', itemController.getById);
router.post('/', itemController.create);
router.put('/:id', itemController.update);
router.delete('/:id', itemController.delete);

export default router;
