import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

function controllerRouting(app) {
  const router = express.Router();
  app.use('/', router);

  // App Controller
  router.get('/status', (reqst, resp) => {
    AppController.getStatus(reqst, resp);
  });

  router.get('/stats', (reqst, resp) => {
    AppController.getStats(reqst, resp);
  });

  // User Controller
  router.post('/users', (reqst, resp) => {
    UsersController.postNew(reqst, resp);
  });

  router.get('/users/me', (reqst, resp) => {
    UsersController.getMe(reqst, resp);
  });

  // Auth Controller
  router.get('/connect', (reqst, resp) => {
    AuthController.getConnect(reqst, resp);
  });

  router.get('/disconnect', (reqst, resp) => {
    AuthController.getDisconnect(reqst, resp);
  });

  // Files Controller
  router.post('/files', (reqst, resp) => {
    FilesController.postUpload(reqst, resp);
  });

  router.get('/files/:id', (reqst, resp) => {
    FilesController.getShow(reqst, resp);
  });

  router.get('/files', (reqst, resp) => {
    FilesController.getIndex(reqst, resp);
  });

  router.put('/files/:id/publish', (reqst, resp) => {
    FilesController.putPublish(reqst, resp);
  });

  router.put('/files/:id/unpublish', (reqst, resp) => {
    FilesController.putUnpublish(reqst, resp);
  });

  router.get('/files/:id/data', (reqst, resp) => {
    FilesController.getFile(reqst, resp);
  });
}

export default controllerRouting;
