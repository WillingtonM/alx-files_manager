// eslint-disable-next-line no-unused-vars
import mongodb from 'mongodb';
import Collection from 'mongodb/lib/collection';
import envLoader from './env_loader';


/**
 * Represents a MongoDB client.
 */
class DBClient {
  /**
   * Creates a new DBClient instance.
   */
  constructor() {
    envLoader();
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const dbURL = `mongodb://${host}:${port}/${database}`;

    this.client = new mongodb.MongoClient(dbURL, { 
      useUnifiedTopology: true 
    });
    this.client.connect();
  }
  
  /**
   * Retrieves number of users in database.
   * @returns {Promise<Number>}
   */
  async nbUsers() {
    return this.client.db().collection('users').countDocuments();
  }

  /**
   * Checks if this client's connection to MongoDB server is active.
   * @returns {boolean}
   */
  isAlive() {
    return this.client.isConnected();
  }

  /**
   * Retrieves reference to `users` collection.
   * @returns {Promise<Collection>}
  */
 async usersCollection() {
   return this.client.db().collection('users');
  }
  
  /**
   * Retrieves number of files in database.
   * @returns {Promise<Number>}
   */
  async nbFiles() {
    return this.client.db().collection('files').countDocuments();
  }

  /**
   * Retrieves reference to `files` collection.
   * @returns {Promise<Collection>}
   */
  async filesCollection() {
    return this.client.db().collection('files');
  }
}

export const dbClient = new DBClient();
export default dbClient;
