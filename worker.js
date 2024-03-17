/* eslint-disable import/no-named-as-default */
import { writeFile } from 'fs';
import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import imgThumbnail from 'image-thumbnail';
import mongoDBCore from 'mongodb/lib/core';
import dbClient from './utils/db';
import Mailer from './utils/mailer';

const FILE_ASYNC_WRITE = promisify(writeFile);
const fileQ = new Queue('thumbnail generation');
const userQ = new Queue('email sending');

/**
 * Generates thumbnail of an image with given width size.
 * @param {String} fPath Location of original file.
 * @param {number} size Width of thumbnail.
 * @returns {Promise<void>}
 */
const genThumbnail = async (fPath, size) => {
  const buff = await imgThumbnail(fPath, { width: size });
  console.log(`Generating file: ${fPath}, size: ${size}`);
  return FILE_ASYNC_WRITE(`${fPath}_${size}`, buff);
};

fileQ.process(async (job, done) => {
  const fileId = job.data.fileId || null;
  const userId = job.data.userId || null;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }
  console.log('Processing', job.data.name || '');
  const fle = await (await dbClient.filesCollection())
    .findOne({
      _id: new mongoDBCore.BSON.ObjectId(fileId),
      userId: new mongoDBCore.BSON.ObjectId(userId),
    });
  if (!fle) {
    throw new Error('File not found');
  }
  const szes = [500, 250, 100];
  Promise.all(szes.map((size) => genThumbnail(fle.localPath, size)))
    .then(() => {
      done();
    });
});

userQ.process(async (job, done) => {
  const userId = job.data.userId || null;

  if (!userId) {
    throw new Error('Missing userId');
  }
  const usr = await (await dbClient.usersCollection())
    .findOne({ _id: new mongoDBCore.BSON.ObjectId(userId) });
  if (!usr) {
    throw new Error('User not found');
  }
  console.log(`Welcome ${user.email}!`);
  try {
    const mailSubj = 'Welcome to ALX-Files_Manager by B3zaleel';
    const mailCont = [
      '<div>',
      '<h3>Hello {{user.name}},</h3>',
      'Welcome to ALX-Files_Manager, a simple file management API',
      ' built with Node.js We hope it meets your needs.',
      '',
      '</div>',
    ].join('');
    Mailer.sendMail(Mailer.buildMessage(user.email, mailSubj, mailCont));
    done();
  } catch (err) {
    done(err);
  }
});
