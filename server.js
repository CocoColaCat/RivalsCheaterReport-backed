// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const admin = require('firebase-admin');

// ================================================
// 從環境變數讀取 Firebase 憑證（推薦方式）
// ================================================
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // 生產環境（Render / Vercel / Railway 等）：單一環境變數，內容是整個 JSON 字串
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error('無法解析 FIREBASE_SERVICE_ACCOUNT 環境變數', err);
    process.exit(1);
  }
} else if (process.env.NODE_ENV !== 'production') {
  // 本地開發：直接讀取檔案（記得加到 .gitignore）
  try {
    serviceAccount = require('./firebase-service-account.json');
  } catch (err) {
    console.warn('找不到本地 firebase-service-account.json，使用環境變數模式');
  }
} else {
  console.error('缺少 FIREBASE_SERVICE_ACCOUNT 環境變數');
  process.exit(1);
}

// ================================================
// 初始化 Firebase Admin
// ================================================
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app"
  // ↑ 建議也放環境變數 FIREBASE_DATABASE_URL
});

const db = admin.database();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // 生產環境建議改成你的前端網域，例如 "https://your-frontend.onrender.com"
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 簡單根路由，確認伺服器活著
app.get('/', (req, res) => {
  res.send('Rivals Report Backend is running');
});

// ================================================
// Socket.IO 主要邏輯
// ================================================
io.on('connection', (socket) => {
  console.log(`用戶連線: ${socket.id}`);

  // 加入 reports 房間，方便全域廣播
  socket.join('reports');

  // 1. 客戶端要求取得所有 pending reports
  socket.on('getReports', async () => {
    try {
      const snapshot = await db.ref('reports')
        .orderByChild('status')
        .equalTo('pending')
        .once('value');

      const reports = [];
      snapshot.forEach((child) => {
        reports.push({
          id: child.key,
          ...child.val()
        });
      });

      socket.emit('reportsList', reports);
    } catch (err) {
      console.error('取得 reports 失敗:', err);
      socket.emit('error', '無法載入報告列表');
    }
  });

  // 2. 提交新報告
  socket.on('submitReport', async (data) => {
    const { username, evidence_url, timestamp, additional_info } = data;

    if (!username || !evidence_url || !timestamp) {
      socket.emit('submitResponse', {
        success: false,
        message: '缺少必要欄位（username, evidence_url, timestamp）'
      });
      return;
    }

    const newReportRef = db.ref('reports').push();

    const reportData = {
      username: username.trim(),
      evidence_url: evidence_url.trim(),
      timestamp: timestamp.trim(),
      additional_info: (additional_info || '').trim(),
      votes_cheater: 0,
      votes_innocent: 0,
      status: 'pending',
      createdAt: admin.database.ServerValue.TIMESTAMP,
      submittedAt: new Date().toISOString()
    };

    try {
      await newReportRef.set(reportData);
      
      // 廣播給所有在 reports 房間的人
      io.to('reports').emit('newReport', {
        id: newReportRef.key,
        ...reportData
      });

      socket.emit('submitResponse', {
        success: true,
        message: '報告提交成功！'
      });
    } catch (err) {
      console.error('提交報告失敗:', err);
      socket.emit('submitResponse', {
        success: false,
        message: '伺服器錯誤，請稍後再試'
      });
    }
  });

  // 3. 投 Cheater
  socket.on('voteCheater', async (reportId) => {
    if (!reportId) return;

    const ref = db.ref(`reports/${reportId}/votes_cheater`);

    try {
      await ref.transaction((current) => (current || 0) + 1);
      const snapshot = await db.ref(`reports/${reportId}`).once('value');
      const updated = snapshot.val();

      io.to('reports').emit('voteUpdate', {
        id: reportId,
        ...updated
      });
    } catch (err) {
      console.error('投票 Cheater 失敗:', err);
    }
  });

  // 4. 投 Innocent
  socket.on('voteInnocent', async (reportId) => {
    if (!reportId) return;

    const ref = db.ref(`reports/${reportId}/votes_innocent`);

    try {
      await ref.transaction((current) => (current || 0) + 1);
      const snapshot = await db.ref(`reports/${reportId}`).once('value');
      const updated = snapshot.val();

      io.to('reports').emit('voteUpdate', {
        id: reportId,
        ...updated
      });
    } catch (err) {
      console.error('投票 Innocent 失敗:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`用戶斷線: ${socket.id}`);
  });
});

// ================================================
// 啟動伺服器
// ================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`伺服器運行於埠號 ${PORT}`);
  console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
});
