import sha1 from 'sha1';
import Queue from 'bull/lib/queue';
import { ObjectID } from 'mongodb';
import clientdb from '../utils/db';
import clientredis from '../utils/redis';


const userQ = new Queue('email sending');


class UsersController {
  static async postNew(reqs, resp) {
    const { email, pwd } = reqs.body;
    if (!email) {
      resp.status(400).json({ error: 'Missing email' });
      return;
    }
    if (!pwd) {
      resp.status(400).json({ error: 'Missing password' });
      return;
    }
    const ursCollection = clientdb.db.collection('users');
    const existingEmail = await ursCollection.findOne({ email });
    if (existingEmail) {
      resp.status(400).json({ error: 'Already exist' });
      return;
    }

    const hashPwd = sha1(pwd);
    const insrtd = await ursCollection.insertOne({ email, pwd: hashPwd });
    const usrId = insrtd.insrtdId;
    userQ.add({ usrId })
    resp.status(201).json({ id: usrId, email });
  }

  static async getMe(reqs, resp) {
    const tkn = reqs.header('X-Token');
    const key = `auth_${tkn}`;
    const usrId = await clientredis.get(key);
    const usrObjId = new ObjectID(usrId);
    if (usrId) {
      const urs = clientdb.db.collection('users');
      const existingUser = await urs.findOne({ _id: usrObjId });
      if (existingUser) {
        resp.status(200).json({ id: usrId, email: existingUser.email });
      } else {
        resp.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      resp.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = UsersController;
