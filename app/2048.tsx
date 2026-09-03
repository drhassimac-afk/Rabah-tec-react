import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getSocket } from '../src/api/socket';

type Board = number[][];

const SIZE = 4;

const C = {
  bg: '#0B1120',
  surface: '#161F2E',
  border: '#243044',
  primary: '#F59E0B',
  text: '#FFFFFF',
  sub: '#94A3B8',
  gold: '#FACC15',
  success: '#22C55E',
  danger: '#EF4444',
};

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(0),
  );
}

function addRandomTile(board: Board): Board {
  const next = board.map((row) => [...row]);
  const empty: [number, number][] = [];

  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (next[r][c] === 0) {
        empty.push([r, c]);
      }
    }
  }

  if (empty.length === 0) return next;

  const [r, c] =
    empty[Math.floor(Math.random() * empty.length)];

  next[r][c] = Math.random() < 0.9 ? 2 : 4;

  return next;
}

function createBoard(): Board {
  let board = emptyBoard();
  board = addRandomTile(board);
  board = addRandomTile(board);
  return board;
}

function moveLine(line: number[]): {
  line: number[];
  score: number;
  moved: boolean;
} {
  const compact = line.filter((value) => value !== 0);
  const result: number[] = [];
  let score = 0;

  for (let i = 0; i < compact.length; i += 1) {
    if (
      i + 1 < compact.length &&
      compact[i] === compact[i + 1]
    ) {
      const merged = compact[i] * 2;
      result.push(merged);
      score += merged;
      i += 1;
    } else {
      result.push(compact[i]);
    }
  }

  while (result.length < SIZE) {
    result.push(0);
  }

  const moved = result.some(
    (value, index) => value !== line[index],
  );

  return {
    line: result,
    score,
    moved,
  };
}

function moveBoard(
  board: Board,
  direction: 'left' | 'right' | 'up' | 'down',
): {
  board: Board;
  score: number;
  moved: boolean;
} {
  const next = emptyBoard();
  let totalScore = 0;
  let moved = false;

  if (direction === 'left' || direction === 'right') {
    for (let r = 0; r < SIZE; r += 1) {
      const original = [...board[r]];
      const input =
        direction === 'left'
          ? original
          : [...original].reverse();

      const result = moveLine(input);

      const output =
        direction === 'left'
          ? result.line
          : [...result.line].reverse();

      next[r] = output;
      totalScore += result.score;
      moved = moved || result.moved;
    }
  } else {
    for (let c = 0; c < SIZE; c += 1) {
      const original = [];

      for (let r = 0; r < SIZE; r += 1) {
        original.push(board[r][c]);
      }

      const input =
        direction === 'up'
          ? original
          : [...original].reverse();

      const result = moveLine(input);

      const output =
        direction === 'up'
          ? result.line
          : [...result.line].reverse();

      for (let r = 0; r < SIZE; r += 1) {
        next[r][c] = output[r];
      }

      totalScore += result.score;
      moved = moved || result.moved;
    }
  }

  return {
    board: next,
    score: totalScore,
    moved,
  };
}

function has2048(board: Board): boolean {
  return board.some((row) =>
    row.some((value) => value >= 2048),
  );
}

function canMove(board: Board): boolean {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) return true;

      if (
        c + 1 < SIZE &&
        board[r][c] === board[r][c + 1]
      ) {
        return true;
      }

      if (
        r + 1 < SIZE &&
        board[r][c] === board[r + 1][c]
      ) {
        return true;
      }
    }
  }

  return false;
}

function tileText(value: number): string {
  return value === 0 ? '' : String(value);
}

function tileColor(value: number): string {
  if (value === 0) return '#1E293B';
  if (value === 2) return '#334155';
  if (value === 4) return '#475569';
  if (value === 8) return '#B45309';
  if (value === 16) return '#C2410C';
  if (value === 32) return '#DC2626';
  if (value === 64) return '#B91C1C';
  if (value === 128) return '#A16207';
  if (value === 256) return '#CA8A04';
  if (value === 512) return '#EAB308';
  if (value === 1024) return '#F59E0B';
  return '#FACC15';
}

export default function Game2048Screen() {
  const sock = useRef(getSocket());
  const [board, setBoard] = useState<Board>(createBoard);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] =
    useState(false);

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  useEffect(() => {
    if (finished && !scoreSubmitted) {
      setScoreSubmitted(true);

      sock.current?.emit('game_score_submit', {
        points: score,
        game: '2048',
      });
    }
  }, [finished, score, scoreSubmitted]);

  const move = (
    direction: 'left' | 'right' | 'up' | 'down',
  ) => {
    if (finished) return;

    const result = moveBoard(board, direction);

    if (!result.moved) return;

    const nextBoard = addRandomTile(result.board);
    const nextScore = score + result.score;

    setBoard(nextBoard);
    setScore(nextScore);
    setBest((value) => Math.max(value, nextScore));

    if (has2048(nextBoard)) {
      Vibration.vibrate(30);
      setWon(true);
      setFinished(true);
      return;
    }

    if (!canMove(nextBoard)) {
      Vibration.vibrate([0, 30, 40, 30]);
      setFinished(true);
    }
  };

  const restart = () => {
    setBoard(createBoard());
    setScore(0);
    setFinished(false);
    setWon(false);
    setScoreSubmitted(false);
  };

  const gameTitle = won
    ? 'وصلت إلى 2048! 🎉'
    : 'انتهت اللعبة';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          }}
        >
          <Ionicons
            name="arrow-forward"
            size={24}
            color={C.sub}
          />
        </TouchableOpacity>

        <Text style={s.headerTitle}>2048</Text>

        <TouchableOpacity
          onPress={restart}
          hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          }}
        >
          <Ionicons
            name="refresh"
            size={22}
            color={C.gold}
          />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          s.body,
          {
            opacity: fade,
          },
        ]}
      >
        <View style={s.topRow}>
          <View style={s.stat}>
            <Text style={s.statLabel}>النقاط</Text>
            <Text style={s.statValue}>{score}</Text>
          </View>

          <View style={s.stat}>
            <Text style={s.statLabel}>الأفضل</Text>
            <Text style={s.statValue}>{best}</Text>
          </View>
        </View>

        <View style={s.board}>
          {board.map((row, r) =>
            row.map((value, c) => (
              <View
                key={`${r}-${c}`}
                style={[
                  s.tile,
                  {
                    backgroundColor: tileColor(value),
                  },
                ]}
              >
                <Text
                  style={[
                    s.tileText,
                    value >= 1024 && s.smallTileText,
                  ]}
                >
                  {tileText(value)}
                </Text>
              </View>
            )),
          )}
        </View>

        {finished ? (
          <View style={s.resultBox}>
            <Ionicons
              name={won ? 'trophy' : 'close-circle'}
              size={52}
              color={won ? C.gold : C.danger}
            />

            <Text style={s.resultTitle}>
              {gameTitle}
            </Text>

            <Text style={s.resultSub}>
              نقاطك: {score}
            </Text>

            <TouchableOpacity
              style={s.restartBtn}
              onPress={restart}
            >
              <Text style={s.restartTxt}>
                لعبة جديدة
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.controls}>
            <TouchableOpacity
              style={s.arrowBtn}
              onPress={() => move('up')}
            >
              <Ionicons
                name="arrow-up"
                size={28}
                color={C.text}
              />
            </TouchableOpacity>

            <View style={s.middleControls}>
              <TouchableOpacity
                style={s.arrowBtn}
                onPress={() => move('left')}
              >
                <Ionicons
                  name="arrow-back"
                  size={28}
                  color={C.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.arrowBtn}
                onPress={() => move('down')}
              >
                <Ionicons
                  name="arrow-down"
                  size={28}
                  color={C.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.arrowBtn}
                onPress={() => move('right')}
              >
                <Ionicons
                  name="arrow-forward"
                  size={28}
                  color={C.text}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  headerTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '900',
  },

  body: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
  },

  topRow: {
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18,
  },

  stat: {
    minWidth: 100,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },

  statLabel: {
    color: C.sub,
    fontSize: 12,
    fontWeight: '700',
  },

  statValue: {
    color: C.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },

  board: {
    width: '100%',
    maxWidth: 380,
    aspectRatio: 1,
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: C.border,
  },

  tile: {
    width: '25%',
    aspectRatio: 1,
    padding: 5,
  },

  tileText: {
    flex: 1,
    borderRadius: 10,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: 'transparent',
    color: C.text,
    fontSize: 27,
    fontWeight: '900',
  },

  smallTileText: {
    fontSize: 20,
  },

  controls: {
    alignItems: 'center',
    marginTop: 20,
  },

  middleControls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  arrowBtn: {
    width: 58,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultBox: {
    alignItems: 'center',
    marginTop: 22,
  },

  resultTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },

  resultSub: {
    color: C.sub,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },

  restartBtn: {
    marginTop: 18,
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },

  restartTxt: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
});
