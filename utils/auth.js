/* eslint-disable import/no-named-as-default */
/* eslint-disable no-unused-vars */
import sha1 from 'sha1';
import { Request } from 'express';
import mongoDBCore from 'mongodb/lib/core';
import dbClient from './db';
import redisClient from './redis';

/**
 * Fetches user from Authorization header in given request object.
 * @param {Request} rqst Express request object.
 * @returns {Promise<{_id: ObjectId, email: string, password: string}>}
 */
export const getUserFromAuthorization = async (rqst) => {
  const auth = rqst.headers.authorization || null;

  if (!auth) {
    return null;
  }
  const authParts = auth.split(' ');

  if (authParts.length !== 2 || authParts[0] !== 'Basic') {
    return null;
  }
  const tkn = Buffer.from(authParts[1], 'base64').toString();
  const sepPos = tkn.indexOf(':');
  const email = tkn.substring(0, sepPos);
  const pass = tkn.substring(sepPos + 1);
  const usr = await (await dbClient.usersCollection()).findOne({ email });

  if (!usr || sha1(pass) !== usr.password) {
    return null;
  }
  return usr;
};

/**
 * Fetches user from X-Token header in given request object.
 * @param {Request} rqst Express request object.
 * @returns {Promise<{_id: ObjectId, email: string, password: string}>}
 */
export const getUserFromXToken = async (rqst) => {
  const tkn = rqst.headers['x-token'];

  if (!tkn) {
    return null;
  }
  const userId = await redisClient.get(`auth_${tkn}`);
  if (!userId) {
    return null;
  }
  const usr = await (await dbClient.usersCollection())
    .findOne({ _id: new mongoDBCore.BSON.ObjectId(userId) });
  return usr || null;
};

export default {
  getUserFromAuthorization: async (rqst) => getUserFromAuthorization(rqst),
  getUserFromXToken: async (rqst) => getUserFromXToken(rqst),
};
