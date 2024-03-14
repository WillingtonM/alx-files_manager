import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import Queue from 'bull';
import userUtils from '../utils/user';
import fileUtils from '../utils/file';
import basicUtils from '../utils/basic';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const fileQ = new Queue('fileQueue');

class FilesController {
  /**
   * Should create new file in DB & in disk
   *
   * Retrieve user based on token:
   * Return new file with status code 201
   */
  static async postUpload(reqst, resp) {
    const { usrId } = await userUtils.getUserIdAndKey(reqst);

    if (!basicUtils.isValidId(usrId)) {
      return resp.status(401).send({ error: 'Unauthorized' });
    }
    if (!usrId && reqst.body.type === 'image') {
      await fileQ.add({});
    }

    const usr = await userUtils.getUser({
      _id: ObjectId(usrId),
    });

    if (!usr) return resp.status(401).send({ error: 'Unauthorized' });

    const { error: validationError, fileParams } = await fileUtils.validateBody(
      reqst,
    );

    if (validationError) { return resp.status(400).send({ error: validationError }); }

    if (fileParams.parentId !== 0 && !basicUtils.isValidId(fileParams.parentId)) { return resp.status(400).send({ error: 'Parent not found' }); }

    const { error, code, newFile } = await fileUtils.saveFile(
      usrId,
      fileParams,
      FOLDER_PATH,
    );

    if (error) {
      if (resp.body.type === 'image') await fileQ.add({ usrId });
      return resp.status(code).send(error);
    }

    if (fileParams.type === 'image') {
      await fileQ.add({
        fileId: newFile.id.toString(),
        userId: newFile.userId.toString(),
      });
    }

    return resp.status(201).send(newFile);
  }

  /**
   * Should retrieve file document based on ID
   *
   * Retrieve user based on token:
   * Otherwise, return file document
   */
  static async getShow(reqst, resp) {
    const fileId = reqst.params.id;

    const { usrId } = await userUtils.getUserIdAndKey(reqst);

    const usr = await userUtils.getUser({
      _id: ObjectId(usrId),
    });

    if (!usr) return resp.status(401).send({ error: 'Unauthorized' });

    if (!basicUtils.isValidId(fileId) || !basicUtils.isValidId(usrId)) { return resp.status(404).send({ error: 'Not found' }); }

    const result = await fileUtils.getFile({
      _id: ObjectId(fileId),
      userId: ObjectId(usrId),
    });

    if (!result) return resp.status(404).send({ error: 'Not found' });

    const file = fileUtils.processFile(result);

    return resp.status(200).send(file);
  }

  /**
   * should retrieve all users file documents for a specific
   *
   * Retrieve the user based on the token:
   * Pagination can be done directly by the aggregate of MongoDB
   */
  static async getIndex(reqst, resp) {
    const { usrId } = await userUtils.getUserIdAndKey(reqst);

    const usr = await userUtils.getUser({
      _id: ObjectId(usrId),
    });

    if (!usr) return resp.status(401).send({ error: 'Unauthorized' });

    let parentId = reqst.query.parentId || '0';

    if (parentId === '0') parentId = 0;

    let page = Number(reqst.query.page) || 0;

    if (Number.isNaN(page)) page = 0;

    if (parentId !== 0 && parentId !== '0') {
      if (!basicUtils.isValidId(parentId)) { return resp.status(401).send({ error: 'Unauthorized' }); }

      parentId = ObjectId(parentId);

      const folder = await fileUtils.getFile({
        _id: ObjectId(parentId),
      });

      if (!folder || folder.type !== 'folder') { return resp.status(200).send([]); }
    }

    const pipeline = [
      { $match: { parentId } },
      { $skip: page * 20 },
      {
        $limit: 20,
      },
    ];

    const fileCursor = await fileUtils.getFilesOfParentId(pipeline);

    const fileList = [];
    await fileCursor.forEach((doc) => {
      const document = fileUtils.processFile(doc);
      fileList.push(document);
    });

    return resp.status(200).send(fileList);
  }

  /**
   * Should set isPublic to true on file document based on ID
   *
   * Retrieve user based on token:
   * Return file document with status code 200
   */
  static async putPublish(reqst, resp) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      reqst,
      true,
    );

    if (error) return resp.status(code).send({ error });

    return resp.status(code).send(updatedFile);
  }

  /**
   * Should set isPublic to false on file document based on ID
   *
   * Retrieve user based token:
   * Return file document with status code 200
   */
  static async putUnpublish(reqst, resp) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      reqst,
      false,
    );

    if (error) return resp.status(code).send({ error });

    return resp.status(code).send(updatedFile);
  }

  /**
   * Should return content of file document based on ID
   *
   * If no file document is linked to ID passed parameter, return error
   * Return content of file with correct MIME-type
   */
  static async getFile(reqst, resp) {
    const { usrId } = await userUtils.getUserIdAndKey(reqst);
    const { id: fileId } = reqst.params;
    const size = reqst.query.size || 0;

    if (!basicUtils.isValidId(fileId)) { return resp.status(404).send({ error: 'Not found' }); }

    const fle = await fileUtils.getFile({
      _id: ObjectId(fileId),
    });

    if (!fle || !fileUtils.isOwnerAndPublic(fle, usrId)) { return resp.status(404).send({ error: 'Not found' }); }

    if (fle.type === 'folder') {
      return resp
        .status(400)
        .send({ error: "A folder doesn't have content" });
    }

    const { error, code, data } = await fileUtils.getFileData(fle, size);

    if (error) return resp.status(code).send({ error });

    const mimeType = mime.contentType(fle.name);

    resp.setHeader('Content-Type', mimeType);

    return resp.status(200).send(data);
  }
}

export default FilesController;
