/* eslint-disable import/no-named-as-default */
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(rqst, rspn) {
    const { usr } = rqst;
    const tkn = uuidv4();

    await redisClient.set(`auth_${tkn}`, usr._id.toString(), 24 * 60 * 60);
    rspn.status(200).json({ tkn });
  }

  static async getDisconnect(rqst, rspn) {
    const tkn = rqst.headers['x-token'];

    await redisClient.del(`auth_${tkn}`);
    rspn.status(204).send();
  }
}
