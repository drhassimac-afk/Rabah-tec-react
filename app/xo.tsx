import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSocket } from '../src/api/socket';

type XOState = {
  board: Array<'X' | 'O' | null>;
  turn: 'X' | 'O';
  winner: 'X' | 'O' | 'draw' | null;
  players: {
    X?: string;
    O?: string;
  };
};

const C = {
  bg: '#0B1120',
  surface: '#161F2E',
  border: '#243044',
  primary: '#3B82F6',
  text: '#FFFFFF',
  sub: '#94A3B8',
  muted: '#64748B',
  gold: '#FACC15',
  danger: '#EF4444',
  success: '#22C55E',
};

function Cell({
  value,
  onPress,
  disabled,
}: {
  value: 'X' | 'O' | null;
  onPress: () => void;
  disabled: boolean;
}) {
  const scale = useRef(new Animated.Value(value ? 1 : 0)).current;
  const previous = useRef(value);

  useEffect(() => {
    if (value && !previous.current) {
      scale.setValue(0);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 14,
      }).start();
    }

    if (!value) {
      scale.setValue(0);
    }

    previous.current = value;
  }, [value, scale]);

  return (
    <TouchableOpacity
      style={styles.cell}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled || !!value}
    >
      <Animated.Text
        style={[
          styles.cellText,
          { transform: [{ scale }] },
          value === 'X' && { color: C.primary },
          value === 'O' && { color: C.danger },
        ]}
      >
        {value || ''}
      </Animated.Text>
    </TouchableOpacity>
  );
}

export default function XOGameScreen() {
  const socket = useRef(getSocket());
  const [state, setState] = useState<XOState>({
    board: Array(9).fill(null),
    turn: 'X',
    winner: null,
    players: {},
  });

  const [connected, setConnected] = useState(
    !!socket.current?.connected
  );

  useEffect(() => {
    const s = socket.current;

    if (!s) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onState = (next: XOState) => setState(next);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('xo_state', onState);

    s.emit('xo_join');

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('xo_state', onState);
    };
  }, []);

  const mySymbol =
    state.players.X === socket.current?.id
      ? 'X'
      : state.players.O === socket.current?.id
        ? 'O'
        : null;

  const myTurn =
    !!mySymbol &&
    mySymbol === state.turn &&
    !state.winner &&
    connected;

  const press = (index: number) => {
    if (!myTurn || state.board[index] || state.winner) return;
    socket.current?.emit('xo_move', { index });
  };

  useEffect(() => {
    if (!state.winner || state.winner === 'draw' || !mySymbol) return;

    if (state.winner === mySymbol) {
      socket.current?.emit('game_score_submit', {
        points: 50,
        game: 'xo',
      });
    }
  }, [state.winner, mySymbol]);

  const reset = () => {
    socket.current?.emit('xo_reset');
  };

  let statusText = '';
  let statusColor = C.text;

  if (!connected) {
    statusText = 'جاري الاتصال بالسيرفر...';
    statusColor = C.gold;
  } else if (state.winner === 'draw') {
    statusText = 'تعادل! 🤝';
    statusColor = C.gold;
  } else if (state.winner) {
    const iWon = state.winner === mySymbol;
    statusText = iWon ? 'فزت! 🎉' : `فاز ${state.winner} 🎉`;
    statusColor = iWon ? C.success : C.danger;
  } else if (!mySymbol) {
    statusText = 'الغرفة ممتلئة — شاهد فقط';
    statusColor = C.muted;
  } else {
    statusText = myTurn ? 'دورك أنت' : 'دور الطرف الآخر';
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-forward" size={24} color={C.sub} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>إكس أو</Text>

        <TouchableOpacity
          onPress={reset}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh" size={22} color={C.gold} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {mySymbol && (
          <View
            style={[
              styles.symbolChip,
              {
                borderColor:
                  mySymbol === 'X' ? C.primary : C.danger,
              },
            ]}
          >
            <Text
              style={[
                styles.symbolChipText,
                {
                  color:
                    mySymbol === 'X' ? C.primary : C.danger,
                },
              ]}
            >
              أنت: {mySymbol}
            </Text>
          </View>
        )}

        <Text style={[styles.status, { color: statusColor }]}>
          {statusText}
        </Text>

        <View style={[styles.board, myTurn && styles.boardActive]}>
          {state.board.map((cell, index) => (
            <Cell
              key={index}
              value={cell}
              onPress={() => press(index)}
              disabled={!myTurn}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={reset}
          activeOpacity={0.8}
        >
          <Text style={styles.resetText}>لعبة جديدة</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  symbolChip: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 10,
  },
  symbolChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  status: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 24,
  },
  board: {
    width: 270,
    height: 270,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    overflow: 'hidden',
    opacity: 0.85,
  },
  boardActive: {
    opacity: 1,
  },
  cell: {
    width: 90,
    height: 90,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 42,
    fontWeight: '900',
    color: C.text,
  },
  resetButton: {
    marginTop: 28,
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  resetText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
