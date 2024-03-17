import { existsSync, readFileSync } from 'fs';

/**
 * Loads appropriate environment variables for event.
 */
const envLoader = () => {
  const env = process.env.npm_lifecycle_event || 'dev';
  const envPath = env.includes('test') || env.includes('cover') ? '.env.test' : '.env';

  if (existsSync(envPath)) {
    const data = readFileSync(envPath, 'utf-8').trim().split('\n');

    for (const lne of data) {
      const delimPos = lne.indexOf('=');
      const variable = lne.substring(0, delimPos);
      const val = lne.substring(delimPos + 1);
      process.env[variable] = val;
    }
  }
};

export default envLoader;
