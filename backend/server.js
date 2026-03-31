require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const { google } = require('googleapis');
const Token = require('./models/Token');
const Email = require('./models/Email');

const app = express();

app.use(express.json());
app.use(cors()); 

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas!'))
  .catch((error) => console.error('Error connecting to MongoDB:', error.message));


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BACKEND_URL || 'http://localhost:5000'}/auth/callback`
);


app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', 
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly', 
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query; 
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email;
    
    let existingToken = await Token.findOne({ user: userEmail });
    
    if (existingToken) {
      existingToken.access_token = tokens.access_token;
      existingToken.refresh_token = tokens.refresh_token || existingToken.refresh_token; 
      existingToken.expiry_date = tokens.expiry_date;
      await existingToken.save();
      console.log(`Tokens updated in MongoDB for ${userEmail}!`);
    } else {
      const newToken = new Token({
        user: userEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date
      });
      await newToken.save();
      console.log("Tokens securely saved to MongoDB!");
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?email=${encodeURIComponent(userEmail)}`); 
    
  } catch (error) {
    console.error('Error saving tokens:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/emails/search', async (req, res) => {
  try {
    const keyword = req.query.q?.toLowerCase(); 
    const userEmail = req.query.email;
    
    if (!keyword) return res.status(400).json({ error: "Keyword required" });
    if (!userEmail) return res.status(400).json({ error: "User email required for searching" });

    const cachedEmails = await Email.find({ keyword: keyword, userId: userEmail })
      .sort({ date: -1 })
      .limit(5);
    let cacheReturned = false;
    if (cachedEmails.length > 0) {
      console.log(`🚀 Found ${keyword} in MongoDB Cache! Returning immediately.`);
      res.json(cachedEmails);
      cacheReturned = true;
    }

    console.log(`🔍 Refreshing cache with new emails from Gmail API for: ${keyword}`);

    const tokenDoc = await Token.findOne({ user: userEmail });
    if (!tokenDoc) {
      if (!cacheReturned) return res.status(401).json({ error: "Please log in" });
      return;
    }

    let credentialsToSet = {
      access_token: tokenDoc.access_token,
      refresh_token: tokenDoc.refresh_token,
      expiry_date: tokenDoc.expiry_date
    };

    const isExpired = !tokenDoc.expiry_date || Date.now() > (tokenDoc.expiry_date - 300000);

    if (isExpired && tokenDoc.refresh_token) {
      console.log('🔄 Access token expired. Refreshing automatically using your refresh_token...');
      
      oauth2Client.setCredentials({ refresh_token: tokenDoc.refresh_token });
      
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
      
        tokenDoc.access_token = credentials.access_token;
        tokenDoc.expiry_date = credentials.expiry_date;
        if (credentials.refresh_token) {
          tokenDoc.refresh_token = credentials.refresh_token;
        }
        await tokenDoc.save();
        console.log('✅ Token refreshed and saved to MongoDB!');
        credentialsToSet = {
          access_token: tokenDoc.access_token,
          refresh_token: tokenDoc.refresh_token,
          expiry_date: tokenDoc.expiry_date
        };
      } catch (refreshErr) {
        console.error("Failed to automatically refresh token:", refreshErr.message);
        if (!cacheReturned) return res.status(401).json({ error: "Session expired. Please click 'Connect Gmail' to log in again." });
        return; 
      }
    }

    oauth2Client.setCredentials(credentialsToSet);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: keyword,
      maxResults: 50
    });
    const messages = response.data.messages || [];

    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        const msgData = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });
        
        const headers = msgData.data.payload.headers;
        const details = {
          userId: userEmail,
          keyword: keyword,
          gmailId: msg.id,
          subject: headers.find(h => h.name === 'Subject')?.value || 'No Subject',
          from: headers.find(h => h.name === 'From')?.value || 'Unknown',
          date: headers.find(h => h.name === 'Date')?.value,
          snippet: msgData.data.snippet
        };

        return await Email.findOneAndUpdate(
          { gmailId: details.gmailId }, 
          details, 
          { upsert: true, new: true }
        );
      })
    );

    if (!cacheReturned) {
      res.json(emailDetails);
    }

  } catch (error) {
    console.error('Error:', error);
    if (!res.headersSent) {
      const rawMessage =
        error?.message ||
        error?.response?.data?.error?.message ||
        '';

      if (/Gmail API has not been used/i.test(rawMessage)) {
        return res.status(500).json({
          error: 'Gmail API is not enabled in your Google Cloud project. Enable Gmail API and try again.'
        });
      }

      if (/insufficient authentication scopes/i.test(rawMessage)) {
        return res.status(401).json({
          error: 'Missing Gmail permission. Reconnect Google and allow Gmail read access.'
        });
      }

      res.status(500).json({ error: 'Search failed' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});