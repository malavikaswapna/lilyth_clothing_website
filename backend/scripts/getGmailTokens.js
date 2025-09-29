const { google } = require('googleapis');
const readline = require('readline');

// OAuth2 credentials from Google Cloud Console
const oauth2Client = new google.auth.OAuth2(
  'YOUR_GOOGLE_CLIENT_ID',
  'YOUR_GOOGLE_CLIENT_SECRET',
  'http://localhost:3000' // redirect URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.send']
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    
    console.log('Add these to your .env file:');
    console.log('GOOGLE_ACCESS_TOKEN=' + token.access_token);
    console.log('GOOGLE_REFRESH_TOKEN=' + token.refresh_token);
    
    oauth2Client.setCredentials(token);
  });
});