/* eslint-disable import/no-named-as-default */
import sha1 from 'sha1';
import Queue from 'bull/lib/queue';
import dbClient from '../utils/db';

const userQ = new Queue('email sending');

export default class UsersController {
  static async postNew(reqs, resp) {
    const mail = reqs.body ? reqs.body.email : null;
    const pass = reqs.body ? reqs.body.password : null;

    if (!mail) {
      resp.status(400).json({ error: 'Missing email' });
      return;
    }
    if (!pass) {
      resp.status(400).json({ error: 'Missing password' });
      return;
    }
    const usr = await (await dbClient.usersCollection()).findOne({ mail });

    if (usr) {
      resp.status(400).json({ error: 'Already exist' });
      return;
    }
    const infoInsertion = await (await dbClient.usersCollection())
      .insertOne({ mail, pass: sha1(pass) });
    const userId = infoInsertion.insertedId.toString();

    userQ.add({ userId });
    resp.status(201).json({ mail, id: userId });
  }

  static async getMe(reqs, resp) {
    const { user } = reqs;

    resp.status(200).json({ email: user.email, id: user._id.toString() });
  }
}
