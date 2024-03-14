import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import clientdb from '../utils/db';
import clientredis from '../utils/redis';

class AuthController {
  static async getConnect(reqst, resp) {
    const authHead = reqst.header('Authorization');
    if (!authHead) {
      return;
    }
    if (typeof (authHead) !== 'string') {
      return;
    }
    if (authHead.slice(0, 6) !== 'Basic ') {
      return;
    }
    const authHeadDetails = authHead.slice(6);
    const decodInfo = Buffer.from(authHeadDetails, 'base64').toString('utf8');
    const dataDecd = decodInfo.split(':');
    if (dataDecd.length !== 2) {
      resp.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const hashPass = sha1(dataDecd[1]);
    const usrs = clientdb.db.collection('users');
    const userDesired = await usrs.findOne({ email: dataDecd[0], password: hashPass });
    if (userDesired) {
      const tokn = uuidv4();
      const tkn_key = `auth_${tokn}`;
      await clientredis.set(tkn_key, userDesired._id.toString(), 862400);
      resp.status(200).json({ tokn });
    } else {
      resp.status(401).json({ error: 'Unauthorized' });
    }
  }

  static async getDisconnect(reqst, resp) {
    const tokn = reqst.header('X-Token');
    const tkn_key = `auth_${tokn}`;
    const idToken = await clientredis.get(tkn_key);
    if (idToken) {
      await clientredis.del(tkn_key);
      resp.status(204).json({});
    } else {
      resp.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = AuthController;
