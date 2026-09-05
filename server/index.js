// RabahTec React — سيرفر كامل (بيانات + ملفات + إشارة WebRTC)
// يعمل محلياً على شبكة WiFi أو على استضافة سحابية بدون أي تعديل في الكود.

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');

const PORT = process.env.PORT || 4000;
const MEDIA_DIR = path.join(__dirname, 'media');

if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ---------- PeerServer للواجهة القديمة (PeerJS) — يعمل على نفس المنفذ 4000 ----------
const peerServer = ExpressPeerServer(server, { path: '/rabahdj', allow_discovery: false });
app.use(peerServer);

// ---------- 1) اكتشاف تلقائي (نفس فكرة RabahDj) ----------
app.get('/ping', (req, res) => {
  res.json({ ok: true, name: 'rabah-tec-react-server', time: Date.now() });
});

// ---------- 2) الملفات (رفع / قائمة / تحميل) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MEDIA_DIR),
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/[^\w.\-]/g, '_');
    cb(null, safeName);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB/ملف

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const room = req.body.room || 'general';
  const from = req.body.from || 'مجهول';
  const meta = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    room,
    from,
    uploadedAt: Date.now(),
  };
  const indexPath = path.join(MEDIA_DIR, 'index.json');
  const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath)) : [];
  index.unshift(meta);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  io.to(room).emit('file-shared', meta);

  res.json({ ok: true, file: meta, url: `/files/${req.file.filename}` });
});

app.get('/files', (req, res) => {
  const room = req.query.room;
  const indexPath = path.join(MEDIA_DIR, 'index.json');
  let index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath)) : [];
  if (room) index = index.filter((f) => f.room === room);
  res.json(index);
});

app.use('/files', express.static(MEDIA_DIR));

// ---------- 3) الألعاب + الإشارة + الحضور عبر Socket.io ----------

if (!global.xoState) {
  global.xoState = {
    board: Array(9).fill(null),
    turn: 'X',
    winner: null,
    players: {},
  };
}

function xoWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 6],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return board.every(Boolean) ? 'draw' : null;
}

// ---------- 3) الإشارة (Signaling) + الحضور (Presence) عبر Socket.io ----------
const roomMembers = new Map(); // room -> Map(socketId -> {name})

function getPresenceList(room) {
  const members = roomMembers.get(room);
  if (!members) return [];
  return Array.from(members.entries()).map(([id, info]) => ({ id, name: info.name }));
}

// ---------- عدد المتصلين الآن على مستوى السيرفر بأكمله (لشاشة الألعاب) ----------
const onlineSockets = new Set();

io.on('connection', (socket) => {
  // تتبع المتصلين الآن
  onlineSockets.add(socket.id);
  socket.emit('init', { onlineUsers: Array.from(onlineSockets) });
  io.emit('onlineUsers', Array.from(onlineSockets));

  // إرسال حالة XO الحالية عند الاتصال
  socket.emit('xo_state', global.xoState);

  socket.on('xo_join', () => {
    const st = global.xoState;

    if (!st.players.X) {
      st.players.X = socket.id;
    } else if (!st.players.O && st.players.X !== socket.id) {
      st.players.O = socket.id;
    }

    io.emit('xo_state', st);
  });

  socket.on('xo_move', (data) => {
    const st = global.xoState;
    const i = data && data.index;

    if (i === undefined || i < 0 || i > 8) return;
    if (st.winner || st.board[i]) return;

    const mySymbol =
      st.players.X === socket.id
        ? 'X'
        : st.players.O === socket.id
          ? 'O'
          : null;

    if (!mySymbol || mySymbol !== st.turn) return;

    st.board[i] = mySymbol;
    st.winner = xoWinner(st.board);

    if (!st.winner) {
      st.turn = st.turn === 'X' ? 'O' : 'X';
    }

    io.emit('xo_state', st);
  });

  socket.on('xo_reset', () => {
    global.xoState.board = Array(9).fill(null);
    global.xoState.turn = 'X';
    global.xoState.winner = null;

    io.emit('xo_state', global.xoState);
  });

  socket.on('join-room', ({ room, name }) => {
    socket.join(room);
    socket.data.room = room;
    socket.data.name = name || 'مستخدم';

    if (!roomMembers.has(room)) roomMembers.set(room, new Map());
    roomMembers.get(room).set(socket.id, { name: socket.data.name });

    socket.emit('room-members', getPresenceList(room).filter((m) => m.id !== socket.id));
    socket.to(room).emit('peer-joined', { id: socket.id, name: socket.data.name });
    io.to(room).emit('presence', getPresenceList(room));
  });

  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, name: socket.data.name, data });
  });

  socket.on('chat', ({ text }) => {
    const room = socket.data.room;
    if (!room) return;
    io.to(room).emit('chat', { name: socket.data.name, text, from: socket.id, time: Date.now() });
  });

  socket.on('room-broadcast', (payload) => {
    const room = socket.data.room;
    if (!room) return;
    socket.to(room).emit('room-broadcast', { ...payload, from: socket.id, name: socket.data.name });
  });

  socket.on('get-presence', () => {
    const room = socket.data.room;
    if (!room) return;
    socket.emit('presence', getPresenceList(room));
  });

  // ---------- نظام نقاط الألعاب والـLeaderboard ----------
  socket.on('get_leaderboard', () => {
    const leaderboard = Object.values(global.gameLeaderboard || {})
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    socket.emit('leaderboard_update', { leaderboard });
  });

  socket.on('game_score_submit', ({ points, game }) => {
    const name = socket.data.name || 'مستخدم';
    const safePoints = Number(points);

    if (!Number.isFinite(safePoints) || safePoints <= 0) return;

    if (!global.gameLeaderboard) {
      global.gameLeaderboard = {};
    }

    if (!global.gameLeaderboard[name]) {
      global.gameLeaderboard[name] = {
        name,
        points: 0,
        games: {},
      };
    }

    global.gameLeaderboard[name].points += Math.floor(safePoints);

    if (game) {
      global.gameLeaderboard[name].games[game] =
        (global.gameLeaderboard[name].games[game] || 0) + Math.floor(safePoints);
    }

    const leaderboard = Object.values(global.gameLeaderboard)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    io.emit('leaderboard_update', { leaderboard });
  });

  socket.on('disconnect', () => {
    onlineSockets.delete(socket.id);
    io.emit('onlineUsers', Array.from(onlineSockets));

    const room = socket.data.room;
    if (room && roomMembers.has(room)) {
      roomMembers.get(room).delete(socket.id);
      if (roomMembers.get(room).size === 0) roomMembers.delete(room);
    }
    if (room) {
      socket.to(room).emit('peer-left', { id: socket.id });
      io.to(room).emit('presence', getPresenceList(room));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`RabahTec React server running on port ${PORT}`);
});
