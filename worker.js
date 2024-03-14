import { writeFile } from 'fs';
import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import imgThumbnail from 'image-thumbnail';
import { ObjectID } from 'mongodb';
import redisClient from './utils/redis';
import dbClient from './utils/db';


const writFileAsync = promisify(writeFile);
const fleQ = new Queue('thumbnail generation');
const usrQ = new Queue('email sending');

/**
 * Generates thumbnail of image with given width size.
 * @param filePath location of original file.
 * @param size width of thumbnail.
 * @returns void
 */
const genThumbNail = async (filePath, size) => {
  const buff = await imgThumbnail(filePath, { width: size });
  console.log(`Generating file: ${filePath}, size: ${size}`);
  return writFileAsync(`${filePath}_${size}`, buff);
};

fleQ.process(async (job, done) => {
  const usrId = job.data.userId || null;
  const fleId = job.data.fileId || null;

  if (!fleId) {
    throw new Error('Missing fileId');
  }
  if (!usrId) {
    throw new Error('Missing userId');
  }
  console.log('Processing', job.data.name || '');
  const usrObjId = new ObjectID(usrId);
  const fleObjId = new ObjectID(fleId);
  const filesCollect = dbClient.db.collection('files');
  const fileObj = await filesCollect.findOne({ _id: fleObjId, userId: usrObjId });
  if (!fileObj) {
    throw new Error('File not found');
  }
  const sizes = [500, 250, 100];
  Promise.all(sizes.map((size) => genThumbNail(fileObj.localPath, size)))
    .then(() => {
      done();
    });
});

usrQ.process(async (job, done) => {
  const usrId = job.data.userId || null;

  if (!usrId) {
    throw new Error('Missing userId');
  }
  const usrObjId = new ObjectID(usrId);
  const user = dbClient.db.collection('users');
  const existingUser = await user.findOne({ _id: usrObjId });
  if (!user) {
    throw new Error('User not found');
  }
  console.log(`Welcome ${user.email}!`);
});
