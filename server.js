const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const crypto = require('crypto');

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set, get, runTransaction, serverTimestamp } = require('firebase/database');

let firebaseConfig;
if (process.env.FIREBASE_CONFIG) {
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  } catch (err) {
    console.error('無法解析 FIREBASE_CONFIG:', err);
    process.exit(1);
  }
} else {
  console.error('缺少 FIREBASE_CONFIG 環境變數');
  process.exit(1);
}

const appFirebase = initializeApp(firebaseConfig);
const db = getDatabase(appFirebase);

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

async function verifyTurnstileToken(token) {
  if (!token || !TURNSTILE_SECRET) return false;

  const postData = `secret=${encodeURIComponent(TURNSTILE_SECRET)}&response=${encodeURIComponent(token)}`;

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'challenges.cloudflare.com',
      path: '/turnstile/v0/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.success) {
            resolve(true);
          } else {
            console.warn('Turnstile 失敗:', result['error-codes']);
            resolve(false);
          }
        } catch (e) {
          console.error('Turnstile 回應解析失敗:', e);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Turnstile 請求失敗:', err.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

function getClientIp(socket) {
  const headers = socket.handshake.headers;
  return (
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-real-ip'] ||
    socket.handshake.address ||
    'unknown'
  );
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

app.get('/', (req, res) => res.send('Rivals Report Backend Running'));

io.on('connection', (socket) => {
  console.log(`用戶連線: ${socket.id}`);
  socket.join('reports');

  // 取得下一個未投過的報告（前端按 Vote on Reports 或 Next 時呼叫）
  socket.on('getNextReport', async () => {
    const ip = getClientIp(socket);
    const ipHash = hashIp(ip);

    try {
      const reportsSnap = await get(ref(db, 'reports'));
      const pending = [];
      reportsSnap.forEach(child => {
        if (child.val().status === 'pending') {
          pending.push({ id: child.key, ...child.val() });
        }
      });

      if (pending.length === 0) {
        return socket.emit('nextReport', null);
      }

      const available = [];
      for (const r of pending) {
        const votedSnap = await get(ref(db, `voted_ips/${r.id}/${ipHash}`));
        if (!votedSnap.exists()) {
          available.push(r);
        }
      }

      if (available.length === 0) {
        return socket.emit('nextReport', null);
      }

      // 隨機挑一個
      const randomIndex = Math.floor(Math.random() * available.length);
      const selected = available[randomIndex];

      socket.emit('nextReport', selected);
    } catch (err) {
      console.error('getNextReport 錯誤:', err);
      socket.emit('nextReport', null);
    }
  });

  // 提交報告
  socket.on('submitReport', async (data) => {
    const { username, evidence_url, timestamp, additional_info, cf_turnstile_token } = data;

    if (!await verifyTurnstileToken(cf_turnstile_token)) {
      return socket.emit('submitResponse', { success: false, message: 'Turnstile 驗證失敗' });
    }

    if (!username || !evidence_url || !timestamp) {
      return socket.emit('submitResponse', { success: false, message: '缺少必要欄位' });
    }

    const newReportRef = push(ref(db, 'reports'));

    const reportData = {
      username: username.trim(),
      evidence_url: evidence_url.trim(),
      timestamp: timestamp.trim(),
      additional_info: (additional_info || '').trim(),
      votes_cheater: 0,
      votes_innocent: 0,
      status: 'pending',
      createdAt: serverTimestamp(),
      submittedAt: new Date().toISOString()
    };

    try {
      await set(newReportRef, reportData);
      io.to('reports').emit('newReport', { id: newReportRef.key, ...reportData });
      socket.emit('submitResponse', { success: true, message: '報告提交成功' });
    } catch (err) {
      console.error('提交報告失敗:', err);
      socket.emit('submitResponse', { success: false, message: '伺服器錯誤' });
    }
  });

  // 投票 Cheater
  socket.on('voteCheater', async (payload) => {
    console.log('voteCheater 收到:', payload);

    if (!payload || typeof payload !== 'object') {
      return socket.emit('voteResponse', { success: false, message: '無效請求格式' });
    }

    let { reportId, cf_turnstile_token } = payload;
    reportId = String(reportId || '').trim();

    if (!reportId) {
      return socket.emit('voteResponse', { success: false, message: '缺少報告 ID' });
    }

    const ip = getClientIp(socket);
    const ipHash = hashIp(ip);

    const votedRef = ref(db, `voted_ips/${reportId}/${ipHash}`);
    const votedSnap = await get(votedRef);

    if (votedSnap.exists()) {
      return socket.emit('voteResponse', { success: false, message: '你已對此報告投過票' });
    }

    if (!await verifyTurnstileToken(cf_turnstile_token)) {
      return socket.emit('voteResponse', { success: false, message: 'Turnstile 驗證失敗' });
    }

    try {
      await runTransaction(ref(db, `reports/${reportId}/votes_cheater`), current => (current || 0) + 1);
      await set(votedRef, true);

      const reportSnap = await get(ref(db, `reports/${reportId}`));
      const updated = reportSnap.val();

      io.to('reports').emit('voteUpdate', { id: reportId, ...updated });
      socket.emit('voteResponse', { success: true });
    } catch (err) {
      console.error('voteCheater 失敗:', err);
      socket.emit('voteResponse', { success: false, message: '投票失敗' });
    }
  });

  // 投票 Innocent
  socket.on('voteInnocent', async (payload) => {
    console.log('voteInnocent 收到:', payload);

    if (!payload || typeof payload !== 'object') {
      return socket.emit('voteResponse', { success: false, message: '無效請求格式' });
    }

    let { reportId, cf_turnstile_token } = payload;
    reportId = String(reportId || '').trim();

    if (!reportId) {
      return socket.emit('voteResponse', { success: false, message: '缺少報告 ID' });
    }

    const ip = getClientIp(socket);
    const ipHash = hashIp(ip);

    const votedRef = ref(db, `voted_ips/${reportId}/${ipHash}`);
    const votedSnap = await get(votedRef);

    if (votedSnap.exists()) {
      return socket.emit('voteResponse', { success: false, message: '你已對此報告投過票' });
    }

    if (!await verifyTurnstileToken(cf_turnstile_token)) {
      return socket.emit('voteResponse', { success: false, message: 'Turnstile 驗證失敗' });
    }

    try {
      await runTransaction(ref(db, `reports/${reportId}/votes_innocent`), current => (current || 0) + 1);
      await set(votedRef, true);

      const reportSnap = await get(ref(db, `reports/${reportId}`));
      const updated = reportSnap.val();

      io.to('reports').emit('voteUpdate', { id: reportId, ...updated });
      socket.emit('voteResponse', { success: true });
    } catch (err) {
      console.error('voteInnocent 失敗:', err);
      socket.emit('voteResponse', { success: false, message: '投票失敗' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`用戶斷線: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`伺服器運行於埠號 ${PORT}`);
});
