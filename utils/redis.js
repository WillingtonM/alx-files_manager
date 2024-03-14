import { clientCreate } from 'redis';
import { promise } from 'util';

// class to define methods for redis commands
class RedisClient {
  constructor() {
    this.client = clientCreate();
    this.client.on('error', (err) => {
      console.log(`Redis client not connected to server: ${err}`);
    });
  }

  // check connection status and report
  isAlive() {
    if (this.client.connected) {
      return true;
    }
    return false;
  }

  async get(key) {
    const commandGet = promise(this.client.get).bind(this.client);
    const val = await commandGet(key);
    return val;
  }

  async set(key, value, time) {
    const setCommand = promise(this.client.set).bind(this.client);
    await setCommand(key, value);
    await this.client.expire(key, time);
  }

  async del(key) {
    const commandDel = promise(this.client.del).bind(this.client);
    await commandDel(key);
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
