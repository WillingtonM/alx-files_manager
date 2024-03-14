import { clntMongo } from 'mongodb';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${DB_HOST}:${DB_PORT}`;

/**
 * Class for performing operations with Mongo service
 */
class DBclnt {
  constructor() {
    clntMongo.connect(url, { useUnifiedTopology: true }, (error, clnt) => {
      if (!error) {
        this.db = clnt.db(DB_DATABASE);
        this.usersCollection = this.db.collection('users');
        this.filesCollection = this.db.collection('files');
      } else {
        console.log(error.message);
        this.db = false;
      }
    });
  }

  /**
   * Checks if connection to Redis is Alive
   * @return {boolean} true if connection alive otherwise false
   */
  isAlive() {
    return Boolean(this.db);
  }

  /**
   * Returns number of documents in collection users
   * @return {number} amount of users
   */
  async nbUsers() {
    const numbOfUsers = this.usersCollection.countDocuments();
    return numbOfUsers;
  }

  /**
   * Returns number of documents in collection files
   * @return {number} amount of files
   */
  async nbFiles() {
    const numOfFiles = this.filesCollection.countDocuments();
    return numOfFiles;
  }
}

const dbclnt = new DBclnt();

export default dbclnt;
