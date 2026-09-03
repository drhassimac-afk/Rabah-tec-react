import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Vibration,
} from 'react-native';
import { router } from 'expo-router';
import { Chess } from 'chess.js';
import { getSocket } from '../src/api/socket';

const BOARD_SIZE = 8;

const PIECES: Record<string, string> = {
  wK: '♔',
  wQ: '♕',
  wR: '♖',
  wB: '♗',
  wN: '♘',
  wP: '♙',
  bK: '♚',
  bQ: '♛',
  bR: '♜',
  bB: '♝',
  bN: '♞',
  bP: '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function pieceSymbol(piece: any): string {
  if (!piece) return '';
  const key = `${piece.color}${piece.type.toUpperCase()}`;
  return PIECES[key] ?? '';
}

export default function ChessScreen() {
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const board = game.board();
  const turn = game.turn();

  const legalTargets = selected
    ? game.moves({ square: selected as any, verbose: true }).map(
        (move: any) => move.to,
      )
    : [];

  const status = game.isCheckmate()
    ? `كش مات — ${turn === 'w' ? 'الأسود' : 'الأبيض'} يفوز`
    : game.isStalemate()
      ? 'تعادل — وضع الجمود'
      : game.isDraw()
        ? 'تعادل'
        : game.isCheck()
          ? `كش — دور ${turn === 'w' ? 'الأبيض' : 'الأسود'}`
          : `دور ${turn === 'w' ? 'الأبيض' : 'الأسود'}`;

  const makeMove = (from: string, to: string) => {
    try {
      const next = new Chess(game.fen());

      next.move({
        from: from as any,
        to: to as any,
        promotion: 'q',
      });

      if (next.isCheckmate()) {
        getSocket()?.emit('game_score_submit', {
          points: 50,
          game: 'chess',
        });
      }

      setGame(next);
      setHistory(next.history());
      setSelected(null);
      Vibration.vibrate(20);
    } catch {
      setSelected(null);
    }
  };

  const handleSquarePress = (square: string) => {
    if (game.isGameOver()) return;

    const piece = game.get(square as any);

    if (selected && legalTargets.includes(square)) {
      makeMove(selected, square);
      return;
    }

    if (piece && piece.color === turn) {
      setSelected(square);
    } else {
      setSelected(null);
    }
  };

  const restart = () => {
    setGame(new Chess());
    setHistory([]);
    setSelected(null);
  };

  const undo = () => {
    if (!history.length) return;

    const next = new Chess();
    const moves = [...history];
    moves.pop();

    for (const move of moves) {
      next.move(move);
    }

    setGame(next);
    setHistory(moves);
    setSelected(null);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>♟️ الشطرنج</Text>
          <Text style={styles.subtitle}>لعبة شطرنج للاعبين</Text>
        </View>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.moves}>
          عدد النقلات: {history.length}
        </Text>
      </View>

      <View style={styles.board}>
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const square = `${FILES[colIndex]}${BOARD_SIZE - rowIndex}`;
            const isDark = (rowIndex + colIndex) % 2 === 1;
            const isSelected = selected === square;
            const isTarget = legalTargets.includes(square);

            return (
              <TouchableOpacity
                key={square}
                activeOpacity={0.8}
                onPress={() => handleSquarePress(square)}
                style={[
                  styles.square,
                  isDark ? styles.darkSquare : styles.lightSquare,
                  isSelected && styles.selectedSquare,
                ]}
              >
                <Text
                  style={[
                    styles.piece,
                    piece?.color === 'w'
                      ? styles.whitePiece
                      : styles.blackPiece,
                  ]}
                >
                  {pieceSymbol(piece)}
                </Text>

                {isTarget && <View style={styles.targetDot} />}

                {colIndex === 0 && (
                  <Text style={styles.rankLabel}>
                    {BOARD_SIZE - rowIndex}
                  </Text>
                )}

                {rowIndex === BOARD_SIZE - 1 && (
                  <Text style={styles.fileLabel}>
                    {FILES[colIndex]}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }),
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={undo}>
          <Text style={styles.controlText}>↶ تراجع</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={restart}>
          <Text style={styles.controlText}>↻ لعبة جديدة</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>طريقة اللعب</Text>
        <Text style={styles.infoText}>
          اختر قطعة من لونك ثم اختر المربع الذي تريد نقلها إليه.
          يتم السماح فقط بالنقلات القانونية.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 34,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  statusBox: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  status: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  moves: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 5,
  },
  board: {
    width: '100%',
    aspectRatio: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 10,
    overflow: 'hidden',
  },
  square: {
    width: '12.5%',
    height: '12.5%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lightSquare: {
    backgroundColor: '#E2E8F0',
  },
  darkSquare: {
    backgroundColor: '#64748B',
  },
  selectedSquare: {
    backgroundColor: '#F59E0B',
  },
  piece: {
    fontSize: 34,
    lineHeight: 38,
  },
  whitePiece: {
    color: '#FFFFFF',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  blackPiece: {
    color: '#111827',
  },
  targetDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  rankLabel: {
    position: 'absolute',
    left: 3,
    top: 2,
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
  },
  fileLabel: {
    position: 'absolute',
    right: 3,
    bottom: 1,
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  controlText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  infoBox: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoText: {
    color: '#CBD5E1',
    lineHeight: 21,
    textAlign: 'right',
  },
});
