import express from 'express';
import * as ctrl from '../controllers/navigationController.mjs';

const router = express.Router();

// Modules
router.get(['/modules', '/modules/'], ctrl.listModules);
router.post(['/modules', '/modules/'], ctrl.createModule);

// Menus
router.get(['/menus', '/menus/'], ctrl.listMenus);
router.post(['/menus', '/menus/'], ctrl.createMenu);
router.get(['/modules/:id/menus', '/modules/:id/menus/'], ctrl.menusByModule);

// Navigation
router.get(['/my-navigation', '/my-navigation/'], ctrl.myNavigation);

// User permissions
router.get(['/userpermissions', '/userpermissions/'], ctrl.listUserPermissions);
router.post(['/userpermissions', '/userpermissions/'], ctrl.createUserPermission);
router.put(['/userpermissions/:id', '/userpermissions/:id/'], ctrl.updateUserPermission);
router.delete(['/userpermissions/:id', '/userpermissions/:id/'], ctrl.deleteUserPermission);

// Users
router.get(['/users', '/users/'], ctrl.listUsers);
router.get(['/users/:id', '/users/:id/'], ctrl.getUser);
router.post(['/users', '/users/'], ctrl.createUser);
router.put(['/users/:id', '/users/:id/'], ctrl.updateUser);

export default router;