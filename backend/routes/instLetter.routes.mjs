import express from 'express';
import * as ctrl from '../controllers/instLettercontroller.js';

const router = express.Router();

router.post('/', ctrl.create);
router.get('/:docRecId', ctrl.getOne);
router.delete('/:docRecId', ctrl.remove);

export default router;
