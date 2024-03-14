import {
  expect, use, should, request,
} from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import { ObjectId } from 'mongodb';
import app from '../server';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

use(chaiHttp);
should();

// User Endpoints ==============================================

describe('testing User Endpoints', () => {
  const credentials = 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=';
  let tkn = '';
  let ursId = '';
  const usr = {
    email: 'john@test.com',
    password: 'toatl2543!',
  };

  before(async () => {
    await redisClient.client.flushall('ASYNC');
    await dbClient.usersCollection.deleteMany({});
    await dbClient.filesCollection.deleteMany({});
  });

  after(async () => {
    await redisClient.client.flushall('ASYNC');
    await dbClient.usersCollection.deleteMany({});
    await dbClient.filesCollection.deleteMany({});
  });

  // users
  describe('pOST /users', () => {
    it('returns the id and email of created user', async () => {
      const resp = await request(app).post('/users').send(usr);
      const bd = JSON.parse(resp.text);
      expect(bd.email).to.equal(usr.email);
      expect(bd).to.have.property('id');
      expect(resp.statusCode).to.equal(201);

      ursId = bd.id;
      const usrMongo = await dbClient.usersCollection.findOne({
        _id: ObjectId(bd.id),
      });
      expect(usrMongo).to.exist;
    });

    it('fails to create user because password is missing', async () => {
      const usr = {
        email: 'john@test.com',
      };
      const resp = await request(app).post('/users').send(usr);
      const bd = JSON.parse(resp.text);
      expect(bd).to.eql({ error: 'Missing password' });
      expect(resp.statusCode).to.equal(400);
    });

    it('fails to create user because email is missing', async () => {
      const usr = {
        password: 'toto1234!',
      };
      const resp = await request(app).post('/users').send(usr);
      const bd = JSON.parse(resp.text);
      expect(bd).to.eql({ error: 'Missing email' });
      expect(resp.statusCode).to.equal(400);
    });

    it('fails to create user because it already exists', async () => {
      const usr = {
        email: 'john@test.com',
        password: 'toto1234!',
      };
      const resp = await request(app).post('/users').send(usr);
      const bd = JSON.parse(resp.text);
      expect(bd).to.eql({ error: 'Already exist' });
      expect(resp.statusCode).to.equal(400);
    });
  });

  // Connect

  describe('gET /connect', () => {
    it('fails if no user is found for credentials', async () => {
      const resp = await request(app).get('/connect').send();
      const bd = JSON.parse(resp.text);
      expect(bd).to.eql({ error: 'Unauthorized' });
      expect(resp.statusCode).to.equal(401);
    });

    it('returns a token if user is for credentials', async () => {
      const spyRedisSet = sinon.spy(redisClient, 'set');

      const resp = await request(app)
        .get('/connect')
        .set('Authorization', credentials)
        .send();
      const bd = JSON.parse(resp.text);
      tkn = bd.token;
      expect(bd).to.have.property('token');
      expect(resp.statusCode).to.equal(200);
      expect(
        spyRedisSet.calledOnceWithExactly(`auth_${tkn}`, ursId, 24 * 3600),
      ).to.be.true;

      spyRedisSet.restore();
    });

    it('token exists in redis', async () => {
      const redistkn = await redisClient.get(`auth_${tkn}`);
      expect(redistkn).to.exist;
    });
  });

  // Disconnect

  describe('gET /disconnect', () => {
    after(async () => {
      await redisClient.client.flushall('ASYNC');
    });

    it('should responde with unauthorized because there is no token for user', async () => {
      const resp = await request(app).get('/disconnect').send();
      const bd = JSON.parse(resp.text);
      expect(bd).to.eql({ error: 'Unauthorized' });
      expect(resp.statusCode).to.equal(401);
    });

    it('should sign-out the user based on the token', async () => {
      const resp = await request(app)
        .get('/disconnect')
        .set('X-Token', tkn)
        .send();
      expect(resp.text).to.be.equal('');
      expect(resp.statusCode).to.equal(204);
    });

    it('token no longer exists in redis', async () => {
      const redistkn = await redisClient.get(`auth_${tkn}`);
      expect(redistkn).to.not.exist;
    });
  });

  describe('gET /users/me', () => {
    before(async () => {
      const resp = await request(app)
        .get('/connect')
        .set('Authorization', credentials)
        .send();
      const bd = JSON.parse(resp.text);
      tkn = bd.token;
    });

    it('should return unauthorized because no token is passed', async () => {
      const resp = await request(app).get('/users/me').send();
      const bd = JSON.parse(resp.text);

      expect(bd).to.be.eql({ error: 'Unauthorized' });
      expect(resp.statusCode).to.equal(401);
    });

    it('should retrieve the user base on the token used', async () => {
      const resp = await request(app)
        .get('/users/me')
        .set('X-Token', tkn)
        .send();
      const bd = JSON.parse(resp.text);

      expect(bd).to.be.eql({ id: ursId, email: user.email });
      expect(resp.statusCode).to.equal(200);
    });
  });
});
