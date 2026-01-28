// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const admin = require('firebase-admin');

// ================== 填入你的 Firebase 配置 ==================
const serviceAccount = require('./your-service-account-key.json'); // 或用環境變數

// 或者直接用 Web SDK 配置（較不安全，但 Render 環境變數可放）
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxxxxxxxxxxxxx"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount), // 推薦方式（上傳 json 到 Render）
  databaseURL: firebaseConfig.databaseURL
});

const db = admin.database();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // 生產改成你的前端網域
    methods: ["GET", "POST"]
  }
});

// 根路由（可選，確認後端活著）
app.get('/', (req, res) => res.send('Rivals Report Backend Running'));

// ================== Socket.IO 邏輯 ==================
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 加入「reports」房間，方便廣播
  socket.join('reports');

  // 取得所有 pending reports（給新連線的人）
  socket.on('getReports', async () => {
    try {
      const snapshot = await db.ref('reports').orderByChild('status').equalTo('pending').once('value');
      const reports = [];
      snapshot.forEach(child => {
        reports.push({ id: child.key, ...child.val() });
      });
      socket.emit('reportsList', reports);
    } catch (err) {
      console.error(err);
      socket.emit('error', 'Failed to load reports');
    }
  });

  // 提交新報告
  socket.on('submitReport', async (data) => {
    const { username, evidence_url, timestamp, additional_info } = data;

    if (!username || !evidence_url || !timestamp) {
      socket.emit('submitResponse', { success: false, message: 'Missing required fields' });
      return;
    }

    const newReportRef = db.ref('reports').push();
    const reportData = {
      username,
      evidence_url,
      timestamp,
      additional_info: additional_info || '',
      votes_cheater: 0,
      votes_innocent: 0,
      status: 'pending',
      createdAt: admin.database.ServerValue.TIMESTAMP
    };

    try {
      await newReportRef.set(reportData);
      io.to('reports').emit('newReport', { id: newReportRef.key, ...reportData });
      socket.emit('submitResponse', { success: true, message: 'Report submitted!' });
    } catch (err) {
      console.error(err);
      socket.emit('submitResponse', { success: false, message: 'Server error' });
    }
  });

  // 投 Cheater
  socket.on('voteCheater', async (reportId) => {
    const ref = db.ref(`reports/${reportId}/votes_cheater`);
    try {
      await ref.transaction(current => (current || 0) + 1);
      const snapshot = await db.ref(`reports/${reportId}`).once('value');
      io.to('reports').emit('voteUpdate', { id: reportId, ...snapshot.val() });
    } catch (err) {
      console.error(err);
    }
  });

  // 投 Innocent（同上邏輯）
  socket.on('voteInnocent', async (reportId) => {
    const ref = db.ref(`reports/${reportId}/votes_innocent`);
    try {
      await ref.transaction(current => (current || 0) + 1);
      const snapshot = await db.ref(`reports/${reportId}`).once('value');
      io.to('reports').emit('voteUpdate', { id: reportId, ...snapshot.val() });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
