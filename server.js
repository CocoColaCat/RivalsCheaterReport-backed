// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// 使用 firebase Web SDK（非 admin）
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set, get, update, runTransaction, serverTimestamp } = require('firebase/database');

// ================================================
// 從環境變數讀取 firebaseConfig
// ================================================
let firebaseConfig;

if (process.env.FIREBASE_CONFIG) {
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  } catch (err) {
    console.error('無法解析 FIREBASE_CONFIG 環境變數', err);
    process.exit(1);
  }
} else {
  console.error('缺少 FIREBASE_CONFIG 環境變數');
  process.exit(1);
}

// 初始化 Firebase App
const appFirebase = initializeApp(firebaseConfig);
const db = getDatabase(appFirebase);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 根路由
app.get('/', (req, res) => {
  res.send('Rivals Report Backend is running (using firebase Web SDK)');
});

// ================================================
// Socket.IO 邏輯
// ================================================
io.on('connection', (socket) => {
  console.log(`用戶連線: ${socket.id}`);
  socket.join('reports');

  // 取得所有 pending reports
  socket.on('getReports', async () => {
    try {
      const snapshot = await get(ref(db, 'reports'));
      const reports = [];
      
      snapshot.forEach((child) => {
        if (child.val().status === 'pending') {
          reports.push({
            id: child.key,
            ...child.val()
          });
        }
      });

      socket.emit('reportsList', reports);
    } catch (err) {
      console.error('取得 reports 失敗:', err);
      socket.emit('error', '無法載入報告列表');
    }
  });

  // 提交新報告
  socket.on('submitReport', async (data) => {
    const { username, evidence_url, timestamp, additional_info } = data;

    if (!username || !evidence_url || !timestamp) {
      socket.emit('submitResponse', { success: false, message: '缺少必要欄位' });
      return;
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
      
      // 廣播新報告
      io.to('reports').emit('newReport', {
        id: newReportRef.key,
        ...reportData
      });

      socket.emit('submitResponse', { success: true, message: '報告提交成功！' });
    } catch (err) {
      console.error('提交報告失敗:', err);
      socket.emit('submitResponse', { success: false, message: '伺服器錯誤' });
    }
  });

  // 投票 Cheater
  socket.on('voteCheater', async (reportId) => {
    if (!reportId) return;

    const voteRef = ref(db, `reports/${reportId}/votes_cheater`);

    try {
      await runTransaction(voteRef, (current) => {
        return (current || 0) + 1;
      });

      // 取得更新後的完整報告
      const reportSnap = await get(ref(db, `reports/${reportId}`));
      const updated = reportSnap.val();

      io.to('reports').emit('voteUpdate', {
        id: reportId,
        ...updated
      });
    } catch (err) {
      console.error('投票 Cheater 失敗:', err);
    }
  });

  // 投票 Innocent
  socket.on('voteInnocent', async (reportId) => {
    if (!reportId) return;

    const voteRef = ref(db, `reports/${reportId}/votes_innocent`);

    try {
      await runTransaction(voteRef, (current) => {
        return (current || 0) + 1;
      });

      const reportSnap = await get(ref(db, `reports/${reportId}`));
      const updated = reportSnap.val();

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

// 啟動伺服器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`伺服器運行於埠號 ${PORT}`);
});
