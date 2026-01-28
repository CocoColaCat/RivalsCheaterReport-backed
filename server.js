<!doctype html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roblox Rivals Report System</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
  <style>
    body { box-sizing: border-box; }
    .font-russo { font-family: 'Russo One', sans-serif; }
    .font-rajdhani { font-family: 'Rajdhani', sans-serif; }
    @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); } 50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.8); } }
    @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
    .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .card-hover { transition: all 0.3s ease; }
    .card-hover:hover { transform: translateY(-5px) scale(1.02); }
    .btn-primary { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); transition: all 0.3s ease; }
    .btn-primary:hover { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); transform: scale(1.05); }
    .btn-secondary { background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); transition: all 0.3s ease; }
    .btn-secondary:hover { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); transform: scale(1.05); }
    .glass-card { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
    .warning-banner { background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%); border: 2px solid rgba(251, 191, 36, 0.5); }
    .input-field { background: rgba(30, 41, 59, 0.8); border: 2px solid rgba(239, 68, 68, 0.3); transition: all 0.3s ease; }
    .input-field:focus { border-color: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); outline: none; }
    .vote-card { background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); transition: all 0.3s ease; }
    .vote-card:hover { border-color: rgba(239, 68, 68, 0.5); background: rgba(30, 41, 59, 0.9); }
  </style>
</head>
<body class="h-full font-rajdhani">

<div id="app" class="h-full w-full overflow-auto" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);">

  <div id="home-screen" class="min-h-full flex flex-col p-6">
    <div class="max-w-4xl mx-auto w-full">
      <div class="min-h-screen flex flex-col items-center justify-center">
        <div class="text-center animate-slide-up">
          <div class="mb-8 animate-float">
            <img src="https://raw.githubusercontent.com/CocoColaCat/RivalsCheaterReport/refs/heads/main/icon.png" alt="Rivals Logo" class="w-48 h-48 mx-auto" loading="lazy" onerror="console.error('Image failed to load:', this.src); this.style.background='#ef4444'; this.alt='Rivals Logo unavailable';">
          </div>
          <h1 class="font-russo text-5xl md:text-6xl text-white mb-4 tracking-wider">ROBLOX RIVALS</h1>
          <p class="text-xl md:text-2xl text-gray-400 mb-12 font-medium">UNOFFICIAL REPORT SYSTEM</p>
          <div class="space-y-4 max-w-md mx-auto mb-8">
            <button onclick="showScreen('report')" class="btn-primary w-full py-4 px-8 rounded-xl text-white font-bold text-xl uppercase tracking-wide animate-pulse-glow">
              <span class="flex items-center justify-center gap-3">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Submit Report
              </span>
            </button>
            <button onclick="showScreen('vote')" class="btn-secondary w-full py-4 px-8 rounded-xl text-white font-bold text-xl uppercase tracking-wide">
              <span class="flex items-center justify-center gap-3">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                Vote on Reports
              </span>
            </button>
          </div>
          <div class="warning-banner rounded-xl p-6 max-w-md mx-auto mb-8">
            <div class="flex gap-3 items-start">
              <svg class="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p class="text-yellow-500 font-bold text-sm uppercase tracking-wide">⚠ Disclaimer</p>
                <p class="text-yellow-600 text-sm mt-1">This is NOT an official RIVALS reporting channel</p>
              </div>
            </div>
          </div>
          <div class="animate-bounce text-gray-500">
            <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          </div>
        </div>
      </div>
      <div class="min-h-screen flex flex-col items-center justify-center pb-12">
        <div class="glass-card rounded-2xl p-8 max-w-2xl w-full animate-slide-up">
          <h2 class="font-russo text-3xl text-white mb-6">WHAT IS THIS?</h2>
          <div class="space-y-6">
            <div class="border-l-4 border-red-500 pl-6 py-2">
              <h3 class="font-russo text-xl text-red-500 mb-2">Roblox Rivals Unofficial Report System</h3>
              <p class="text-gray-300">Due to frequent issues with the official Rivals reporting system, this platform has been created to assist the community and developers in identifying and managing cheaters in Roblox Rivals.</p>
            </div>
            <div class="border-l-4 border-blue-500 pl-6 py-2">
              <h3 class="font-russo text-xl text-blue-500 mb-2">How It Works</h3>
              <ul class="text-gray-300 space-y-2">
                <li class="flex gap-3"><span class="text-blue-400 font-bold">1.</span> <span>Submit evidence of cheating with video proof</span></li>
                <li class="flex gap-3"><span class="text-blue-400 font-bold">2.</span> <span>Community members vote on reported accounts</span></li>
                <li class="flex gap-3"><span class="text-blue-400 font-bold">3.</span> <span>Submit possible cheating reports and evidence to official channels</span></li>
              </ul>
            </div>
            <div class="border-l-4 border-yellow-500 pl-6 py-2">
              <h3 class="font-russo text-xl text-yellow-500 mb-2">⚠ Important Notice</h3>
              <p class="text-gray-300">This is a community-driven system and is NOT affiliated with Roblox or the official Roblox Rivals development team. For critical issues, please report directly to official channels.</p>
            </div>
            <div class="border-l-4 border-green-500 pl-6 py-2">
              <h3 class="font-russo text-xl text-green-500 mb-2">Community Powered</h3>
              <p class="text-gray-300">Help maintain a fair and enjoyable gaming experience by reporting suspicious activities and participating in the voting process. Together, we can support a cleaner gameplay environment.</p>
            </div>
          </div>
          <button onclick="scrollToTop()" class="btn-primary w-full mt-8 py-3 px-6 rounded-xl text-white font-bold uppercase tracking-wide">Back to Top</button>
        </div>
      </div>
    </div>
  </div>

  <div id="report-screen" class="min-h-full flex flex-col items-center justify-center p-6 hidden">
    <div class="glass-card rounded-2xl p-8 max-w-lg w-full animate-slide-up">
      <button onclick="showScreen('home')" class="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>
      <h2 class="font-russo text-3xl text-white mb-2">SUBMIT REPORT</h2>
      <p class="text-gray-400 mb-8">Report a suspected cheater with evidence</p>
      <form id="report-form" class="space-y-6">
        <div>
          <label for="username" class="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Cheater's Username</label>
          <input type="text" id="username" name="username" required placeholder="Enter Roblox username" class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
        </div>
        <div>
          <label for="evidence" class="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Evidence (Video Link)</label>
          <input type="url" id="evidence" name="evidence" required placeholder="https://youtube.com/watch?v=..." class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
          <p class="text-gray-500 text-sm mt-2">YouTube, catbox, or other video links</p>
        </div>
        <div>
          <label for="timestamp" class="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Time Stamp</label>
          <input type="text" id="timestamp" name="timestamp" required placeholder="e.g., 2:34 or 2:34 - 3:12" class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
          <p class="text-gray-500 text-sm mt-2">When the cheating occurred in the video</p>
        </div>
        <div>
          <label for="additional-info" class="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Additional Information</label>
          <textarea id="additional-info" name="additional-info" placeholder="Any other details about the incident (optional)" rows="3" class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 resize-none"></textarea>
          <p class="text-gray-500 text-sm mt-2">Optional - provide context or additional details</p>
        </div>
        <div class="mb-6">
          <div class="cf-turnstile" data-sitekey="YOUR_TURNSTILE_SITEKEY_HERE" data-callback="onReportTurnstileSuccess" data-theme="dark" data-size="normal"></div>
        </div>
        <div class="warning-banner rounded-lg p-4">
          <p class="text-yellow-600 text-sm">ℹ Please provide clear evidence of cheating behavior. Reports without proper evidence may be dismissed.</p>
        </div>
        <button type="submit" class="btn-primary w-full py-4 rounded-xl text-white font-bold text-lg uppercase tracking-wide">Submit Report</button>
      </form>
      <div id="submit-message" class="hidden mt-4 p-4 rounded-lg text-center"></div>
    </div>
  </div>

  <div id="warning-modal" class="hidden fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
    <div class="glass-card rounded-2xl p-8 max-w-md w-full animate-slide-up">
      <div class="mb-6">
        <svg class="w-12 h-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h3 class="font-russo text-2xl text-white mb-4 text-center">IMPORTANT WARNING</h3>
      <div class="space-y-4 mb-8">
        <div class="flex gap-3 items-start bg-red-600/20 p-4 rounded-lg border border-red-500/50"><span class="text-red-400 font-bold text-lg flex-shrink-0">1.</span><p class="text-gray-300">Do not submit false reports</p></div>
        <div class="flex gap-3 items-start bg-red-600/20 p-4 rounded-lg border border-red-500/50"><span class="text-red-400 font-bold text-lg flex-shrink-0">2.</span><p class="text-gray-300">Do not submit multiple reports</p></div>
        <div class="flex gap-3 items-start bg-red-600/20 p-4 rounded-lg border border-red-500/50"><span class="text-red-400 font-bold text-lg flex-shrink-0">3.</span><p class="text-gray-300">Final decisions are made by officials</p></div>
      </div>
      <div class="flex gap-3">
        <button onclick="closeWarningModal()" class="flex-1 py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-all">Cancel</button>
        <button onclick="confirmWarningModal()" class="flex-1 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-all">I Understand</button>
      </div>
    </div>
  </div>

  <div id="vote-screen" class="min-h-full flex flex-col items-center justify-center p-6 hidden">
    <div class="max-w-2xl w-full">
      <button onclick="showScreen('home')" class="text-gray-400 hover:text-white mb-8 flex items-center gap-2 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Back to Home
      </button>
      <div id="vote-card" class="glass-card rounded-2xl p-8 animate-slide-up vote-card">
        <div id="vote-progress" class="mb-6 flex items-center justify-between">
          <span class="text-gray-400 text-sm">Report <span id="current-report">1</span> of <span id="total-reports">0</span></span>
          <div id="progress-dots" class="flex gap-1"></div>
        </div>
        <div id="before-vote" class="text-center">
          <div class="mb-8">
            <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <h2 id="player-name" class="font-russo text-4xl text-white mb-2">Loading...</h2>
            <p class="text-gray-400">Is this player cheating?</p>
          </div>
          <div class="mb-6 text-center">
            <div class="cf-turnstile inline-block" data-sitekey="YOUR_TURNSTILE_SITEKEY_HERE" data-callback="onVoteTurnstileSuccess" data-theme="dark" data-size="compact"></div>
          </div>
          <div id="evidence-section" class="mb-8 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <p class="text-gray-400 text-sm mb-3">Evidence:</p>
            <a id="evidence-link" href="#" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-semibold">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <span id="evidence-text">View Video</span>
            </a>
          </div>
          <div id="timestamp-section" class="mb-8 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <p class="text-gray-400 text-sm mb-2">Timestamp:</p>
            <p id="timestamp-text" class="text-white font-semibold text-lg">2:34 - 3:12</p>
          </div>
          <div id="additional-section" class="mb-8 p-4 bg-gray-900/50 rounded-lg border border-gray-700 hidden">
            <p class="text-gray-400 text-sm mb-2">Additional Info:</p>
            <p id="additional-text" class="text-gray-300">...</p>
          </div>
          <div class="flex gap-4">
            <button onclick="castVote('cheater')" class="flex-1 py-4 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg uppercase tracking-wide transition-all hover:scale-105 flex items-center justify-center gap-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Cheater
            </button>
            <button onclick="castVote('innocent')" class="flex-1 py-4 px-6 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg uppercase tracking-wide transition-all hover:scale-105 flex items-center justify-center gap-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Innocent
            </button>
          </div>
        </div>
        <div id="after-vote" class="text-center hidden">
          <div class="mb-8">
            <svg class="w-16 h-16 mx-auto text-green-500 mb-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
            <p class="text-gray-400 text-lg mb-2">Your vote recorded!</p>
          </div>
          <div class="mb-8 p-6 bg-gray-900/50 rounded-lg border border-gray-700">
            <p class="text-gray-400 text-sm mb-4">Community Votes</p>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between items-center mb-2"><span class="text-red-400 font-semibold">CHEATER</span><span id="cheater-count" class="text-white font-bold text-2xl">0</span></div>
                <div class="h-4 bg-gray-700 rounded-full overflow-hidden"><div id="cheater-bar" class="bg-red-500 h-full transition-all duration-500" style="width: 0%"></div></div>
              </div>
              <div>
                <div class="flex justify-between items-center mb-2"><span class="text-green-400 font-semibold">INNOCENT</span><span id="innocent-count" class="text-white font-bold text-2xl">0</span></div>
                <div class="h-4 bg-gray-700 rounded-full overflow-hidden"><div id="innocent-bar" class="bg-green-500 h-full transition-all duration-500" style="width: 0%"></div></div>
              </div>
            </div>
          </div>
          <button onclick="nextReport()" class="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg uppercase tracking-wide transition-all hover:scale-105">Next Report →</button>
        </div>
        <div id="no-more-reports" class="text-center hidden">
          <div class="mb-8">
            <svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h2 class="font-russo text-3xl text-white mb-2">All Done!</h2>
            <p class="text-gray-400 text-lg mb-8">You've voted on all pending reports</p>
          </div>
          <button onclick="showScreen('home')" class="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg uppercase tracking-wide transition-all hover:scale-105">Back to Home</button>
        </div>
      </div>
    </div>
  </div>
</div>

<footer class="fixed bottom-0 left-0 right-0 bg-black/80 border-t border-gray-700 p-4">
  <div class="max-w-4xl mx-auto text-center">
    <p class="text-gray-400 text-sm">Contact: <a href="mailto:zyraofficialservice@gmail.com" class="text-blue-400 hover:text-blue-300 transition-colors font-semibold">zyraofficialservice@gmail.com</a></p>
  </div>
</footer>

<script>
  const SOCKET_URL = 'https://your-render-url.onrender.com';
  const socket = io(SOCKET_URL);

  let reports = [];
  let currentVoteIndex = 0;
  let reportToken = null;
  let voteToken = null;

  socket.on('connect', () => {
    if (!document.getElementById('vote-screen').classList.contains('hidden')) {
      socket.emit('getReports');
    }
  });

  socket.on('reportsList', (data) => {
    reports = data || [];
    if (!document.getElementById('vote-screen').classList.contains('hidden')) {
      currentVoteIndex = 0;
      loadNextReport();
    }
  });

  socket.on('newReport', (report) => {
    reports.push(report);
    if (!document.getElementById('vote-screen').classList.contains('hidden')) {
      updateProgress();
    }
  });

  socket.on('voteUpdate', (updatedReport) => {
    const index = reports.findIndex(r => r.id === updatedReport.id);
    if (index !== -1) {
      reports[index] = updatedReport;
      if (index === currentVoteIndex) {
        updateVoteResults(updatedReport);
      }
    }
  });

  socket.on('submitResponse', (res) => {
    const messageEl = document.getElementById('submit-message');
    messageEl.textContent = res.message;
    messageEl.className = `mt-4 p-4 rounded-lg text-center ${res.success ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`;
    messageEl.classList.remove('hidden');
    if (res.success) document.getElementById('report-form').reset();
    setTimeout(() => messageEl.classList.add('hidden'), 4000);
  });

  socket.on('voteResponse', (res) => {
    if (res.success) {
      document.getElementById('before-vote').classList.add('hidden');
      document.getElementById('after-vote').classList.remove('hidden');
    } else {
      alert(res.message || '投票失敗');
    }
  });

  function showScreen(screen) {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('report-screen').classList.add('hidden');
    document.getElementById('vote-screen').classList.add('hidden');
    document.getElementById(`${screen}-screen`).classList.remove('hidden');
    if (screen === 'report') {
      document.getElementById('warning-modal').classList.remove('hidden');
    }
    if (screen === 'vote') {
      currentVoteIndex = 0;
      socket.emit('getReports');
    }
  }

  function scrollToTop() {
    document.getElementById('app').scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeWarningModal() {
    document.getElementById('warning-modal').classList.add('hidden');
    showScreen('home');
  }

  function confirmWarningModal() {
    document.getElementById('warning-modal').classList.add('hidden');
  }

  function onReportTurnstileSuccess(token) {
    reportToken = token;
  }

  function onVoteTurnstileSuccess(token) {
    voteToken = token;
  }

  document.getElementById('report-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!reportToken) {
      alert('請先完成驗證');
      return;
    }
    const data = {
      username: document.getElementById('username').value.trim(),
      evidence_url: document.getElementById('evidence').value.trim(),
      timestamp: document.getElementById('timestamp').value.trim(),
      additional_info: document.getElementById('additional-info').value.trim(),
      cf_turnstile_token: reportToken
    };
    if (!data.username || !data.evidence_url || !data.timestamp) {
      alert('請填寫所有必填欄位');
      return;
    }
    socket.emit('submitReport', data);
    reportToken = null;
  });

  function castVote(voteType) {
    const report = reports[currentVoteIndex];
    if (!report || !report.id) return;
    if (!voteToken) {
      alert('請先完成驗證');
      return;
    }
    socket.emit(voteType === 'cheater' ? 'voteCheater' : 'voteInnocent', {
      reportId: String(report.id),
      cf_turnstile_token: voteToken
    });
    voteToken = null;
  }

  function loadNextReport() {
    if (currentVoteIndex >= reports.length) {
      document.getElementById('before-vote').classList.add('hidden');
      document.getElementById('after-vote').classList.add('hidden');
      document.getElementById('no-more-reports').classList.remove('hidden');
      return;
    }
    const report = reports[currentVoteIndex];
    document.getElementById('player-name').textContent = escapeHtml(report.username);
    document.getElementById('evidence-link').href = report.evidence_url;
    document.getElementById('evidence-text').textContent = 'View Video';
    document.getElementById('timestamp-text').textContent = escapeHtml(report.timestamp);
    const addSection = document.getElementById('additional-section');
    if (report.additional_info) {
      document.getElementById('additional-text').textContent = escapeHtml(report.additional_info);
      addSection.classList.remove('hidden');
    } else {
      addSection.classList.add('hidden');
    }
    document.getElementById('before-vote').classList.remove('hidden');
    document.getElementById('after-vote').classList.add('hidden');
    document.getElementById('no-more-reports').classList.add('hidden');
    updateProgress();
    updateVoteResults(report);
  }

  function updateVoteResults(report) {
    const total = report.votes_cheater + report.votes_innocent;
    const cheaterPct = total > 0 ? (report.votes_cheater / total) * 100 : 0;
    const innocentPct = total > 0 ? (report.votes_innocent / total) * 100 : 0;
    document.getElementById('cheater-count').textContent = report.votes_cheater;
    document.getElementById('innocent-count').textContent = report.votes_innocent;
    document.getElementById('cheater-bar').style.width = `${cheaterPct}%`;
    document.getElementById('innocent-bar').style.width = `${innocentPct}%`;
  }

  function nextReport() {
    currentVoteIndex++;
    loadNextReport();
  }

  function updateProgress() {
    document.getElementById('current-report').textContent = currentVoteIndex + 1;
    document.getElementById('total-reports').textContent = reports.length;
    const dots = document.getElementById('progress-dots');
    dots.innerHTML = '';
    for (let i = 0; i < reports.length; i++) {
      const dot = document.createElement('div');
      dot.className = `w-2 h-2 rounded-full ${i === currentVoteIndex ? 'bg-red-500' : 'bg-gray-600'}`;
      dots.appendChild(dot);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
</script>
</body>
</html>
