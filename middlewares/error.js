/* eslint-disable no-unused-vars */
import { Request, Response, NextFunction } from 'express';

/**
 * Represents error in this API.
 */
export class APIError extends Error {
  constructor(cde, msg) {
    super();
    this.code = cde || 500;
    this.message = msg;
  }
}

/**
 * Applies Basic authentication to route.
 * @param {Error} err error object.
 * @param {Request} rqst Express request object.
 * @param {Response} rspn Express response object.
 * @param {NextFunction} next Express next function.
 */
export const RespError = (err, rqst, rspn, next) => {  
  const msgDefault = `Failed to process ${rqst.url}`;

  if (err instanceof APIError) {
    rspn.status(err.code).json({ error: err.message || msgDefault });
    return;
  }
  rspn.status(500).json({
    error: err ? err.message || err.toString() : msgDefault,
  });
};
