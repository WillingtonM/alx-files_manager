/* eslint-disable no-unused-vars */
import fs from 'fs';
import readline from 'readline';
import { promisify } from 'util';
import mimeMessage from 'mime-message';
import { gmail_v1 as gmailV1, google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
// File token.json stores user's access and refresh tokens
const PATH_TOKEN = 'token.json';
const FILE_ASYNC_READ = promisify(fs.readFile);
const FILE_ASYNC_WRITE = promisify(fs.writeFile);

/**
 * Get and store new token after prompting for user authorization
 * @param {google.auth.OAuth2} auth2Clnt OAuth2 client to get token for.
 * @param {getEventsCallback} callback Callback for authorized client.
 */
async function getNewTkn(auth2Clnt, callback) {
  const authURL = auth2Clnt.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authURL);
  const lineRead = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  lineRead.question('Enter the code from that page here: ', (code) => {
    lineRead.close();
    auth2Clnt.getToken(code, (err, token) => {
      if (err) {
        console.error('Error retrieving access token', err);
        return;
      }
      auth2Clnt.setCredentials(token);
      FILE_ASYNC_WRITE(PATH_TOKEN, JSON.stringify(token))
        .then(() => {
          console.log('Token stored to', PATH_TOKEN);
          callback(auth2Clnt);
        })
        .catch((writeErr) => console.error(writeErr));
    });
  });
}

/**
 * Create OAuth2 client with given credentials
 * @param {Object} cred Authorization client credentials.
 * @param {function} callback Callback to call with authorized client.
 */
async function authorise(cred, callback) {
  const secretClient = cred.web.client_secret;
  const clientId = cred.web.client_id;
  const redirectURIs = cred.web.redirect_uris;
  const auth2Clnt = new google.auth.OAuth2(
    clientId,
    secretClient,
    redirectURIs[0],
  );
  console.log('Client authorization beginning');
  await FILE_ASYNC_READ(PATH_TOKEN)
    .then((tkn) => {
      auth2Clnt.setCredentials(JSON.parse(tkn));
      callback(auth2Clnt);
    }).catch(async () => getNewTkn(auth2Clnt, callback));
  console.log('Client authorization done');
}

/**
 * Delivers mail through user's account.
 * @param {google.auth.OAuth2} auth Authorized OAuth2 client.
 * @param {gmailV1.Schema$Message} mail Message to send.
 */
function sendMailService(auth, mail) {
  const gmail = google.gmail({ version: 'v1', auth });

  gmail.users.messages.send({
    userId: 'me',
    requestBody: mail,
  }, (err, _res) => {
    if (err) {
      console.log(`The API returned an error: ${err.message || err.toString()}`);
      return;
    }
    console.log('Message sent successfully');
  });
}

/**
 * Contains routines for mail delivery [GMail].
 */
export default class Mailer {
  static checkAuth() {
    FILE_ASYNC_READ('credentials.json')
      .then(async (content) => {
        await authorise(JSON.parse(content), (auth) => {
          if (auth) {
            console.log('Auth check was successful');
          }
        });
      })
      .catch((err) => {
        console.log('Error loading client secret file:', err);
      });
  }

  static buildMessage(dest, subject, msg) {
    const senderEmail = process.env.GMAIL_SENDER;
    const msgData = {
      type: 'text/html',
      encoding: 'UTF-8',
      from: senderEmail,
      to: [dest],
      cc: [],
      bcc: [],
      replyTo: [],
      date: new Date(),
      subject,
      body: msg,
    };

    if (!senderEmail) {
      throw new Error(`Invalid sender: ${senderEmail}`);
    }
    if (mimeMessage.validMimeMessage(msgData)) {
      const msgMime = mimeMessage.createMimeMessage(msgData);
      return { raw: msgMime.toBase64SafeString() };
    }
    throw new Error('Invalid MIME message');
  }

  static sendMail(mail) {
    FILE_ASYNC_READ('credentials.json')
      .then(async (content) => {
        await authorise(
          JSON.parse(content),
          (auth) => sendMailService(auth, mail),
        );
      })
      .catch((err) => {
        console.log('Error loading client secret file:', err);
      });
  }
}
