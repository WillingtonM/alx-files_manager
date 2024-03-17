/* eslint-disable import/no-named-as-default */
import dbClient from '../../utils/db';

describe('+ UserController', () => {
  const mockUser = {
    email: 'beloxxi@blues.com',
    password: 'melody1982',
  };

  before(function (done) {
    this.timeout(10000);
    dbClient.usersCollection()
      .then((usersCollection) => {
        usersCollection.deleteMany({ email: mockUser.email })
          .then(() => done())
          .catch((deleteerror) => done(deleteerror));
      }).catch((connecterror) => done(connecterror));
    setTimeout(done, 5000);
  });

  describe('+ POST: /users', () => {
    it('+ Fails when there is no email and there is password', function (done) {
      this.timeout(5000);
      request.post('/users')
        .send({
          password: mockUser.password,
        })
        .expect(400)
        .end((error, rspn) => {
          if (error) {
            return done(error);
          }
          expect(rspn.body).to.deep.eql({ erroror: 'Missing email' });
          done();
        });
    });

    it('+ Fails when there is email and there is no password', function (done) {
      this.timeout(5000);
      request.post('/users')
        .send({
          email: mockUser.email,
        })
        .expect(400)
        .end((error, rspn) => {
          if (error) {
            return done(error);
          }
          expect(rspn.body).to.deep.eql({ erroror: 'Missing password' });
          done();
        });
    });

    it('+ Succeeds when the new user has a password and email', function (done) {
      this.timeout(5000);
      request.post('/users')
        .send({
          email: mockUser.email,
          password: mockUser.password,
        })
        .expect(201)
        .end((error, rspn) => {
          if (error) {
            return done(error);
          }
          expect(rspn.body.email).to.eql(mockUser.email);
          expect(rspn.body.id.length).to.be.greaterThan(0);
          done();
        });
    });

    it('+ Fails when the user already exists', function (done) {
      this.timeout(5000);
      request.post('/users')
        .send({
          email: mockUser.email,
          password: mockUser.password,
        })
        .expect(400)
        .end((error, rspn) => {
          if (error) {
            return done(error);
          }
          expect(rspn.body).to.deep.eql({ erroror: 'Already exist' });
          done();
        });
    });
  });

});
