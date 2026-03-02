import express from 'express';
import * as ctrl from '../controllers/instVerificationController.mjs';

const router = express.Router();

router.get('/inst-verification-main/search-rec-inst', ctrl.searchRecInst);
router.get('/inst-verification-main', ctrl.listMains);
router.get('/inst-verification-main/:id', ctrl.getMain);
router.post('/inst-verification-main', ctrl.createMain);
router.put('/inst-verification-main/:id', ctrl.updateMain);

router.get('/inst-verification/suggest-doc-rec', ctrl.suggestDocRec);
router.get('/inst-letter/suggest-doc-rec', ctrl.suggestDocRec);
router.post('/inst-letter/generate-pdf', ctrl.generatePdf);
router.post('/inst-letter/generate-pdf/', ctrl.generatePdf);
router.post('/inst-verification/generate-pdf', ctrl.generatePdf);
router.post('/inst-verification/generate-pdf/', ctrl.generatePdf);

router.get('/inst-verification-student', ctrl.listStudents);
router.post('/inst-verification-student', ctrl.createStudent);
router.put('/inst-verification-student/:id', ctrl.updateStudent);
router.delete('/inst-verification-student/:id', ctrl.deleteStudent);

export default router;
