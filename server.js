// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const crypto = require('crypto'); // 用來 hash IP

// Firebase Web SDK
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set, get, runTransaction, serverTimestamp, update } = require('firebase/database');

// 從環境變數讀取
let firebaseConfig;
if (process.env.FIREBASE_CONFIG) {
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  } catch (err) {
    console.error('無法解析 FIREBASE_CONFIG:', err);
    process.exit(1);
  }
} else {
  console.error('缺少 FIREBASE_CONFIG');
  process.exit(1);
}

const appFirebase = initializeApp(firebaseConfig);
const db = getDatabase(appFirebase);

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

async function verifyTurnstileToken(token) {
  if (!token || !TURNSTILE_SECRET) return false;
  try {
    const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', null, {
      params: { secret: TURNSTILE_SECRET, response: token }
    });
    return response.data.success === true;
  } catch (err) {
    console.error('Turnstile 驗證錯誤:', err.message);
    return false;
  }
}

// 取得客戶端 IP（Render 會透過 header 傳遞）
function getClientIp(socket) {
  const headers = socket.handshake.headers;
  return (
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-real-ip'] ||
    socket.handshake.address ||
    'unknown'
  );
}

// 產生 IP 的 SHA-256 hash（隱私保護）
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

app.get('/', (req, res) => res.send('Backend with IP anti-duplicate voting'));

io.on('connection', (socket) => {
  console.log(`用戶連線: ${socket.id}`);

  socket.join('reports');

  socket.on('getReports', async () => {
    try {
      const snapshot = await get(ref(db, 'reports'));
      const reports = [];
      snapshot.forEach(child => {
        if (child.val().status === 'pending') {
          reports.push({ id: child.key, ...child.val() });
        }
      });
      socket.emit('reportsList', reports);
    } catch (err) {
      console.error('getReports 失敗:', err);
      socket.emit('error', '無法載入報告');
    }
  });

  // 提交報告（維持原 Turnstile 驗證）
  socket.on('submitReport', async (data) => {
    const { username, evidence_url, timestamp, additional_info, cf_turnstile_token } = data;

    if (!await verifyTurnstileToken(cf_turnstile_token)) {
      return socket.emit('submitResponse', { success: false, message: 'Turnstile 驗證失敗' });
    }

    // ... 後面原本的提交邏輯（省略不變）
    // 成功後 emit submitResponse
  });

  // 投票 Cheater（加入 IP 防重複）
  socket.on('voteCheater', async (payload) => {
    const { reportId, cf_turnstile_token } = payload;
    if (!reportId) return;

    const ip = getClientIp(socket);
    const ipHash = hashIp(ip);

    // 檢查是否已投過
    const votedRef = ref(db, `voted_ips/${reportId}/${ipHash}`);
    const votedSnap = await get(votedRef);

    if (votedSnap.exists()) {
      return socket.emit('voteResponse', { success: false, message: '你已經對此報告投過票了' });
    }

    // Turnstile 驗證
    if (!await verifyTurnstileToken(cf_turnstile_token)) {
      return socket.emit('voteResponse', { success: false, message: 'Turnstile 驗證失敗' });
    }

    try {
      // 投票 + 記錄 IP
      await runTransaction(ref(db, `reports/${reportId}/votes_cheater`), current => (current || 0) + 1);

      // 記錄已投票
      await set(votedRef, true);

      // 可選：設定 7 天後過期（使用 update + timestamp）
      // await update(votedRef, { votedAt: serverTimestamp(), expiresAt: ... });

      const updated = (await get(ref(db, `reports/${reportId}`))).val();
      io.to('reports').emit('voteUpdate', { id: reportId, ...updated });

      socket.emit('voteResponse', { success: true });
    } catch (err) {
      console.error('voteCheater 失敗:', err);
      socket.emit('voteResponse', { success: false, message: '投票失敗' });
    }
  });

  // 投票 Innocent（同樣邏輯）
  socket.on('voteInnocent', async (payload) => {
    const { reportId, cf_turnstile_token } = payload;
    if (!reportId) return;

    const ip = getClientIp(socket);
    const ipHash = hashIp(ip);

    const votedRef = ref(db, `voted_ips/${reportId}/${ipHash}`);
    const votedSnap = await get(votedRef);

    if (votedSnap.exists()) {
      return socket.emit('voteResponse', { success: false, message: '你已經對此報告投過票了' });
    }

    if (!await verifyTurnstileToken(cf_turnstile_token)) {
      return socket.emit('voteResponse', { success: false, message: 'Turnstile 驗證失敗' });
    }

    try {
      await runTransaction(ref(db, `reports/${reportId}/votes_innocent`), current => (current || 0) + 1);
      await set(votedRef, true);

      const updated = (await get(ref(db, `reports/${reportId}`))).val();
      io.to('reports').emit('voteUpdate', { id: reportId, ...updated });

      socket.emit('voteResponse', { success: true });
    } catch (err) {
      console.error('voteInnocent 失敗:', err);
      socket.emit('voteResponse', { success: false, message: '投票失敗' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`斷線: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
