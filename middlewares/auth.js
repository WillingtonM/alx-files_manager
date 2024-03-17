/* eslint-disable no-unused-vars */
import { Request, Response, NextFunction } from 'express';
import { getUserFromXToken, getUserFromAuthorization } from '../utils/auth';

/**
 * Applies Basic authentication to route.
 * @param {Request} rqst The Express request object.
 * @param {Response} rspn The Express response object.
 * @param {NextFunction} next The Express next function.
 */
export const basicAuthenticate = async (rqst, rspn, next) => {
  const usr = await getUserFromAuthorization(rqst);

  if (!usr) {
    rspn.status(401).json({ error: 'Unauthorized' });
    return;
  }
  rqst.user = usr;
  next();
};

/**
 * Applies X-Token authentication to route.
 * @param {Request} rqst Express request object.
 * @param {Response} rspn Express response object.
 * @param {NextFunction} next The Express next function.
 */
export const xTokenAuthenticate = async (rqst, rspn, next) => {
  const usr = await getUserFromXToken(rqst);

  if (!usr) {
    rspn.status(401).json({ error: 'Unauthorized' });
    return;
  }
  rqst.user = usr;
  next();
};
