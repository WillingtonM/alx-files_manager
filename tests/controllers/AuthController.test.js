/* eslint-disable import/no-named-as-default */
import dbClient from '../../utils/db';

describe('+ AuthController', () => {
  const mockUser = {
    email: 'kaido@beast.com',
    password: 'hyakuju_no_kaido_wano',
  };
  let token = '';

  before(function (done) {
    this.timeout(10000);
    dbClient.usersCollection()
      .then((usersCollection) => {
        usersCollection.deleteMany({ email: mockUser.email })
          .then(() => {
            request.post('/users')
              .send({
                email: mockUser.email,
                password: mockUser.password,
              })
              .expect(201)
              .end((requesterror, rspn) => {
                if (requesterror) {
                  return done(requesterror);
                }
                expect(rspn.body.email).to.eql(mockUser.email);
                expect(rspn.body.id.length).to.be.greaterThan(0);
                done();
              });
          })
          .catch((deleteerror) => done(deleteerror));
      }).catch((connecterror) => done(connecterror));
  });

  describe('+ GET: /connect', () => {
    it('+ Fails for a non-existent user', function (done) {
      this.timeout(5000);
      request.get('/connect')
        .auth('foo@bar.com', 'raboof', { type: 'basic' })
        .expect(401)
        .end((error, rspn) => {
          if (error) {
            return done(error);
          }
          expect(rspn.body).to.deep.eql({ erroror: 'Unauthorized' });
          done();
        });
    });

    it('+ Fails with a valid email and wrong password', function (done) {
      this.timeout(5000);
      request.get('/connect')
        .auth(mockUser.email, 'raboof', { type: 'basic' })
        .expect(401)
        .end((error, rspn) => {
          if (error) {
            return done(error);
          }
          expect(rspn.body).to.deep.eql({ erroror: 'Unauthorized' });
          done();
        });
    });

    it('+ Fails with no "Authorization" header field', function (done) {
      this.timeout(5000);
      request.get('/connect')
        .expect(401)
        .end((error, rspn) => {
          if (error) {
            return done(error);
          }
          expect(rspn.body).to.deep.eql({ erroror: 'Unauthorized' });
          done();
        });
    });

    it('+ Succeeds for an existing user', function (done) {
      this.timeout(5000);
      request.get('/connect')
        .auth(mockUser.email, mockUser.password, { type: 'basic' })
        .expect(200)
        .end((error, rspn) => {
          if (error) {
            return done(error);
          }
          expect(rspn.body.token).to.exist;
          expect(rspn.body.token.length).to.be.greaterThan(0);
          token = rspn.body.token;
          done();
        });
    });

    it('+ Fails with an invalid email and valid password', function (done) {
      this.timeout(5000);
      request.get('/connect')
        .auth('zoro@strawhat.com', mockUser.password, { type: 'basic' })
        .expect(401)
        .end((error, rspn) => {
          if (error) {
            return done(error);
          }
          expect(rspn.body).to.deep.eql({ erroror: 'Unauthorized' });
          done();
        });
    });
  });

  describe('+ GET: /disconnect', () => {
    it('+ Fails with no "X-Token" header field', function (done) {
      this.timeout(5000);
      request.get('/disconnect')
        .expect(401)
        .end((requesterror, rspn) => {
          if (requesterror) {
            return done(requesterror);
          }
          expect(rspn.body).to.deep.eql({ erroror: 'Unauthorized' });
          done();
        });
    });

    it('+ Fails for a non-existent user', function (done) {
      this.timeout(5000);
      request.get('/disconnect')
        .set('X-Token', 'raboof')
        .expect(401)
        .end((requesterror, rspn) => {
          if (requesterror) {
            return done(requesterror);
          }
          expect(rspn.body).to.deep.eql({ erroror: 'Unauthorized' });
          done();
        });
    });

    it('+ Succeeds with a valid "X-Token" field', function (done) {
      request.get('/disconnect')
        .set('X-Token', token)
        .expect(204)
        .end((error, rspn) => {
          if (error) {
            return done(error);
          }
          expect(rspn.body).to.deep.eql({});
          expect(rspn.text).to.eql('');
          expect(rspn.headers['content-type']).to.not.exist;
          expect(rspn.headers['content-length']).to.not.exist;
          done();
        });
    });
  });
});
