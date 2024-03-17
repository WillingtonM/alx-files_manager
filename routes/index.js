// eslint-disable-next-line no-unused-vars
import { Express } from 'express';
import AuthController from '../controllers/AuthController';
import AppController from '../controllers/AppController';
import FilesController from '../controllers/FilesController';
import UsersController from '../controllers/UsersController';
import { APIError, RespError } from '../middlewares/error';
import { basicAuthenticate, xTokenAuthenticate } from '../middlewares/auth';

/**
 * Injects routes with handlers to given Express application.
 * @param {Express} api
 */
const injectRoutes = (api) => {
  api.get('/stats', AppController.getStats);
  api.get('/status', AppController.getStatus);

  api.get('/disconnect', xTokenAuthenticate, AuthController.getDisconnect);
  api.get('/connect', basicAuthenticate, AuthController.getConnect);

  api.get('/users/me', xTokenAuthenticate, UsersController.getMe);
  api.post('/users', UsersController.postNew);

  api.get('/files/:id', xTokenAuthenticate, FilesController.getShow);
  api.post('/files', xTokenAuthenticate, FilesController.postUpload);
  api.put('/files/:id/publish', xTokenAuthenticate, FilesController.putPublish);
  api.get('/files', xTokenAuthenticate, FilesController.getIndex);
  api.get('/files/:id/data', FilesController.getFile);
  api.put('/files/:id/unpublish', xTokenAuthenticate, FilesController.putUnpublish);

  api.all('*', (rqst, rspn, next) => {
    RespError(new APIError(404, `Cannot ${rqst.method} ${rqst.url}`), rqst, rspn, next);
  });
  api.use(RespError);
};

export default injectRoutes;
