require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-zta-token,x-zta-role,x-zta-fingerprint,x-zta-issued-at');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(req.method + ' ' + req.path);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI Interview Bot backend is running' });
});

app.post('/api/auth/session', (req, res) => {
  const token = Buffer.from(Date.now() + '-' + Math.random()).toString('base64');
  res.json({ success: true, token });
});

app.use('/api/resume',    require('./routes/resume'));
app.use('/api/interview', require('./routes/interview'));
app.use('/api/evaluate',  require('./routes/evaluate'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log('─────────────────────────────────────');
  console.log('  AI Interview Bot — Backend Running');
  console.log('  URL   : http://localhost:' + PORT);
  console.log('  Health: http://localhost:' + PORT + '/api/health');
  console.log('─────────────────────────────────────');
});
