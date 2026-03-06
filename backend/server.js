require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Crucial for letting React talk to Express
const { google } = require('googleapis');
const Token = require('./models/Token');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); 

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas!'))
  .catch((error) => console.error('Error connecting to MongoDB:', error.message));

// --- GOOGLE OAUTH SETUP ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5000/auth/callback' // Must match the Cloud Console exactly
);

// --- API ROUTES ---

// 1. Generate the Google Login URL
app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests a refresh token so you don't have to log in constantly
    scope: ['https://www.googleapis.com/auth/gmail.readonly'] // The exact permission we are asking for
  });
  res.redirect(url); // Send the user to the Google sign-in page
});

// 2. The Callback Route (Where Google sends the tokens)
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query; 
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Check if a token already exists for you
    let existingToken = await Token.findOne({ user: 'rwc.iraaditi@gmail.com' });
    
    if (existingToken) {
      // Update the existing token in the database
      existingToken.access_token = tokens.access_token;
      existingToken.refresh_token = tokens.refresh_token || existingToken.refresh_token; // Keep old refresh token if Google doesn't send a new one
      existingToken.expiry_date = tokens.expiry_date;
      await existingToken.save();
      console.log("Tokens updated in MongoDB!");
    } else {
      // Create a brand new token entry
      const newToken = new Token({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date
      });
      await newToken.save();
      console.log("Tokens securely saved to MongoDB!");
    }

    // Send the user back to the React frontend instead of showing a blank JSON screen
    res.redirect('http://localhost:5173/'); 
    
  } catch (error) {
    console.error('Error saving tokens:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/emails/search', async (req,res) => {
  try{
    const keyword = req.query.q;
    if(!keyword){
      return res.status(400).json({ error: "Please provide a search keyword." });
    }
    const tokenDoc = await Token.findOne({ user : 'rwc.iraaditi@gmail.com' });
    if(!tokenDoc){
      return res.status(401).json({ error: "No token found. Please log in first."});
    }
    oauth2Client.setCredentials({
      access_token: tokenDoc.access_token,
      refresh_token: tokenDoc.refresh_token,
    });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: keyword,
      maxResults: 10
    });

    const messages = response.data.messages || [];
    const emailDetails = await Promise.all(
      messages.map(async (msg) =>{
        const msgData = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });

        const headers = msgData.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        return {
          id: msg.id,
          subject: subject,
          from: from,
          date: date,
          snippet: msgData.data.snippet
        };
      })
    );

    res.json(emailDetails);
  } catch (error){
    console.error('Error fetching emails:', error);
    res.status(500).json({error: 'Failed to search emails' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});