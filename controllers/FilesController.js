/* eslint-disable import/no-named-as-default */
/* eslint-disable no-unused-vars */
import { tmpdir } from 'os';
import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import { v4 as uuidv4 } from 'uuid';
import {
  mkdir, writeFile, stat, existsSync, realpath,
} from 'fs';
import { join as joinPath } from 'path';
import { Request, Response } from 'express';
import { contentType } from 'mime-types';
import mongoDBCore from 'mongodb/lib/core';
import dbClient from '../utils/db';
import { getUserFromXToken } from '../utils/auth';

const FILE_TYPES_VALID = {
  folder: 'folder',
  file: 'file',
  image: 'image',
};
const MAIN_FOLDER_ID = 0;
const DFLT_ROOT_FOLDER = 'files_manager';
const MKDIR_ASYNC = promisify(mkdir);
const FILE_ASYNC_WRITE = promisify(writeFile);
const ASYNC_STAT = promisify(stat);
const ASYNC_REALPATH = promisify(realpath);
const PAGE_MAX_FILES = 20;
const fileQ = new Queue('thumbnail generation');
const ID_NULL = Buffer.alloc(24, '0').toString('utf-8');
const checkValidId = (id) => {
  const sze = 24;
  let cnt = 0;
  const charRanges = [
    [48, 57], // 0 - 9
    [97, 102], // a - f
    [65, 70], // A - F
  ];
  if (typeof id !== 'string' || id.length !== sze) {
    return false;
  }
  while (cnt < sze) {
    const cde = id[cnt].charCodeAt(0);

    if (!charRanges.some((range) => cde >= range[0] && cde <= range[1])) {
      return false;
    }
    cnt += 1;
  }
  return true;
};

export default class FilesController {
  /**
   * Uploads file.
   * @param {Request} rqst Express request object.
   * @param {Response} rspn Express response object.
   */
  static async postUpload(rqst, rspn) {
    const { user } = rqst;
    const name = rqst.body ? rqst.body.name : null;
    const type = rqst.body ? rqst.body.type : null;
    const parentId = rqst.body && rqst.body.parentId ? rqst.body.parentId : MAIN_FOLDER_ID;
    const isPublic = rqst.body && rqst.body.isPublic ? rqst.body.isPublic : false;
    const dataBase64 = rqst.body && rqst.body.data ? rqst.body.data : '';

    if (!name) {
      rspn.status(400).json({ error: 'Missing name' });
      return;
    }
    if (!type || !Object.values(FILE_TYPES_VALID).includes(type)) {
      rspn.status(400).json({ error: 'Missing type' });
      return;
    }
    if (!rqst.body.data && type !== FILE_TYPES_VALID.folder) {
      rspn.status(400).json({ error: 'Missing data' });
      return;
    }
    if ((parentId !== MAIN_FOLDER_ID) && (parentId !== MAIN_FOLDER_ID.toString())) {
      const fle = await (await dbClient.filesCollection())
        .findOne({
          _id: new mongoDBCore.BSON.ObjectId(checkValidId(parentId) ? parentId : ID_NULL),
        });

      if (!fle) {
        rspn.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (fle.type !== FILE_TYPES_VALID.folder) {
        rspn.status(400).json({ error: 'Parent is not a folder' });
        return;
      }
    }
    const userId = user._id.toString();
    const baseDir = `${process.env.FOLDER_PATH || ''}`.trim().length > 0
      ? process.env.FOLDER_PATH.trim()
      : joinPath(tmpdir(), DFLT_ROOT_FOLDER);
    const nFile = {
      userId: new mongoDBCore.BSON.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: (parentId === MAIN_FOLDER_ID) || (parentId === MAIN_FOLDER_ID.toString())
        ? '0'
        : new mongoDBCore.BSON.ObjectId(parentId),
    };
    await MKDIR_ASYNC(baseDir, { recursive: true });
    if (type !== FILE_TYPES_VALID.folder) {
      const localPath = joinPath(baseDir, uuidv4());
      await FILE_ASYNC_WRITE(localPath, Buffer.from(dataBase64, 'base64'));
      nFile.localPath = localPath;
    }
    const infoInsertion = await (await dbClient.filesCollection())
      .insertOne(nFile);
    const fileId = infoInsertion.insertedId.toString();
    if (type === FILE_TYPES_VALID.image) {
      const jobName = `Image thumbnail [${userId}-${fileId}]`;
      fileQ.add({ userId, fileId, name: jobName });
    }
    rspn.status(201).json({
      id: fileId,
      userId,
      name,
      type,
      isPublic,
      parentId: (parentId === MAIN_FOLDER_ID) || (parentId === MAIN_FOLDER_ID.toString())
        ? 0
        : parentId,
    });
  }

  static async getShow(rqst, rspn) {
    const { user } = rqst;
    const id = rqst.params ? rqst.params.id : ID_NULL;
    const userId = user._id.toString();
    const fle = await (await dbClient.filesCollection())
      .findOne({
        _id: new mongoDBCore.BSON.ObjectId(checkValidId(id) ? id : ID_NULL),
        userId: new mongoDBCore.BSON.ObjectId(checkValidId(userId) ? userId : ID_NULL),
      });

    if (!fle) {
      rspn.status(404).json({ error: 'Not found' });
      return;
    }
    rspn.status(200).json({
      id,
      userId,
      name: fle.name,
      type: fle.type,
      isPublic: fle.isPublic,
      parentId: fle.parentId === MAIN_FOLDER_ID.toString()
        ? 0
        : fle.parentId.toString(),
    });
  }

  /**
   * Retrieves files associated with specific user.
   * @param {Request} rqst Express request object.
   * @param {Response} rspn Express response object.
   */
  static async getIndex(rqst, rspn) {
    const { user } = rqst;
    const parentId = rqst.query.parentId || MAIN_FOLDER_ID.toString();
    const page = /\d+/.test((rqst.query.page || '').toString())
      ? Number.parseInt(rqst.query.page, 10)
      : 0;
    const filesFilter = {
      userId: user._id,
      parentId: parentId === MAIN_FOLDER_ID.toString()
        ? parentId
        : new mongoDBCore.BSON.ObjectId(checkValidId(parentId) ? parentId : ID_NULL),
    };

    const files = await (await (await dbClient.filesCollection())
      .aggregate([
        { $match: filesFilter },
        { $sort: { _id: -1 } },
        { $skip: page * PAGE_MAX_FILES },
        { $limit: PAGE_MAX_FILES },
        {
          $project: {
            _id: 0,
            id: '$_id',
            userId: '$userId',
            name: '$name',
            type: '$type',
            isPublic: '$isPublic',
            parentId: {
              $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' },
            },
          },
        },
      ])).toArray();
    rspn.status(200).json(files);
  }

  static async putPublish(rqst, rspn) {
    const { user } = rqst;
    const { id } = rqst.params;
    const userId = user._id.toString();
    const fileFilt = {
      _id: new mongoDBCore.BSON.ObjectId(checkValidId(id) ? id : ID_NULL),
      userId: new mongoDBCore.BSON.ObjectId(checkValidId(userId) ? userId : ID_NULL),
    };
    const fle = await (await dbClient.filesCollection())
      .findOne(fileFilt);

    if (!fle) {
      rspn.status(404).json({ error: 'Not found' });
      return;
    }
    await (await dbClient.filesCollection())
      .updateOne(fileFilt, { $set: { isPublic: true } });
    rspn.status(200).json({
      id,
      userId,
      name: fle.name,
      type: fle.type,
      isPublic: true,
      parentId: fle.parentId === MAIN_FOLDER_ID.toString()
        ? 0
        : fle.parentId.toString(),
    });
  }

  static async putUnpublish(rqst, rspn) {
    const { user } = rqst;
    const { id } = rqst.params;
    const userId = user._id.toString();
    const fileFilt = {
      _id: new mongoDBCore.BSON.ObjectId(checkValidId(id) ? id : ID_NULL),
      userId: new mongoDBCore.BSON.ObjectId(checkValidId(userId) ? userId : ID_NULL),
    };
    const fle = await (await dbClient.filesCollection())
      .findOne(fileFilt);

    if (!fle) {
      rspn.status(404).json({ error: 'Not found' });
      return;
    }
    await (await dbClient.filesCollection())
      .updateOne(fileFilt, { $set: { isPublic: false } });
    rspn.status(200).json({
      id,
      userId,
      name: fle.name,
      type: fle.type,
      isPublic: false,
      parentId: fle.parentId === MAIN_FOLDER_ID.toString()
        ? 0
        : fle.parentId.toString(),
    });
  }

  /**
   * Retrieves content of file.
   * @param {Request} rqst Express request object.
   * @param {Response} rspn Express response object.
   */
  static async getFile(rqst, rspn) {
    const user = await getUserFromXToken(rqst);
    const { id } = rqst.params;
    const sze = rqst.query.size || null;
    const userId = user ? user._id.toString() : '';
    const fileFilt = {
      _id: new mongoDBCore.BSON.ObjectId(checkValidId(id) ? id : ID_NULL),
    };
    const fle = await (await dbClient.filesCollection())
      .findOne(fileFilt);

    if (!fle || (!fle.isPublic && (fle.userId.toString() !== userId))) {
      rspn.status(404).json({ error: 'Not found' });
      return;
    }
    if (fle.type === FILE_TYPES_VALID.folder) {
      rspn.status(400).json({ error: 'A folder doesn\'t have content' });
      return;
    }
    let filePath = fle.localPath;
    if (sze) {
      filePath = `${fle.localPath}_${sze}`;
    }
    if (existsSync(filePath)) {
      const fleInfo = await ASYNC_STAT(filePath);
      if (!fleInfo.isFile()) {
        rspn.status(404).json({ error: 'Not found' });
        return;
      }
    } else {
      rspn.status(404).json({ error: 'Not found' });
      return;
    }
    const absoluteflePath = await ASYNC_REALPATH(filePath);
    rspn.setHeader('Content-Type', contentType(fle.name) || 'text/plain; charset=utf-8');
    rspn.status(200).sendFile(absoluteflePath);
  }
}
