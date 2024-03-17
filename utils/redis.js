import { promisify } from 'util';
import { createClient } from 'redis';

/**
 * Represents Redis client.
 */
class RedisClient {
  /**
   * Creates new RedisClient instance.
   */
  constructor() {
    this.client = createClient();
    this.isClientConnected = true;
    this.client.on('error', (err) => {
      console.error('Redis client failed to connect:', err.message || err.toString());
      this.isClientConnected = false;
    });
    this.client.on('connect', () => {
      this.isClientConnected = true;
    });
  }

  /**
   * Checks if this client's connection to Redis server is active.
   * @returns {boolean}
   */
  isAlive() {
    return this.isClientConnected;
  }

  /**
   * Retrieves value of given key.
   * @param {String} key Key of item to retrieve.
   * @returns {String | Object}
   */
  async get(r_key) {
    return promisify(this.client.GET).bind(this.client)(r_key);
  }

  /**
   * Stores key and its value along with expiration time.
   * @param {String} key Key of item to store.
   * @param {String | Number | Boolean} val Item to store.
   * @param {Number} expire Expiration time of item in seconds.
   * @returns {Promise<void>}
   */
  async set(key, val, expire) {
    await promisify(this.client.SETEX)
      .bind(this.client)(key, expire, val);
  }

  /**
   * Removes value of given key.
   * @param {String} d_key Key of item to remove.
   * @returns {Promise<void>}
   */
  async del(d_key) {
    await promisify(this.client.DEL).bind(this.client)(d_key);
  }
}

export const redisClient = new RedisClient();
export default redisClient;
