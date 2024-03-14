import clientdb from '../utils/db';
import clientredis from '../utils/redis';

class AppController {
  static getStatus(reqst, resp) {
    const statusRedis = clientredis.isAlive();
    const statusDB = clientdb.isAlive();
    resp.status(200).send({ redis: statusRedis, db: statusDB });
  }

  static async getStats(reqst, resp) {
    const userDocsNum = await clientdb.nbUsers();
    const fileDocsNum = await clientdb.nbFiles();
    resp.status(200).send({ users: userDocsNum, files: fileDocsNum });
  }
}
module.exports = AppController;
