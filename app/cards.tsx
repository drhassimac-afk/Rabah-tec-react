import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSocket } from '../src/api/socket';

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

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J,12=Q,13=K,14=A
const LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

function randomCard() {
  const value = VALUES[Math.floor(Math.random() * VALUES.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { value, suit };
}

function cardLabel(value: number) {
  return LABELS[value] || String(value);
}

export default function CardsGameScreen() {
  const socket = useRef(getSocket());
  const [current, setCurrent] = useState(randomCard());
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [lastResult, setLastResult] = useState<'win' | 'lose' | null>(null);

  const submitScore = (points: number) => {
    if (points <= 0) return;
    socket.current?.emit('game_score_submit', { points, game: 'cards' });
  };

  const guess = (choice: 'higher' | 'lower') => {
    if (gameOver) return;
    const next = randomCard();
    const correct =
      (choice === 'higher' && next.value > current.value) ||
      (choice === 'lower' && next.value < current.value);

    if (next.value === current.value) {
      // تعادل بالقيمة — نعتبرها جولة محايدة، نسحب بطاقة جديدة بدون خسارة
      setCurrent(next);
      return;
    }

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBest((b) => Math.max(b, newStreak));
      setCurrent(next);
      setLastResult('win');
    } else {
      submitScore(streak * 10);
      setGameOver(true);
      setLastResult('lose');
      setCurrent(next);
    }
  };

  const restart = () => {
    setCurrent(randomCard());
    setStreak(0);
    setGameOver(false);
    setLastResult(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-forward" size={24} color={C.sub} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>ورق — أعلى ولا أقل</Text>

        <TouchableOpacity
          onPress={restart}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh" size={22} color={C.gold} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>السلسلة الحالية</Text>
            <Text style={styles.statValue}>{streak}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>أفضل سلسلة</Text>
            <Text style={styles.statValue}>{best}</Text>
          </View>
        </View>

        {gameOver ? (
          <Text style={[styles.status, { color: C.danger }]}>
            انتهت اللعبة! نقاطك: {streak * 10} 🏆
          </Text>
        ) : (
          <Text style={[styles.status, { color: C.text }]}>
            {lastResult === 'win' ? 'إجابة صحيحة! 🎉' : 'خمّن البطاقة التالية'}
          </Text>
        )}

        <View style={styles.cardBox}>
          <Text style={styles.cardText}>
            {cardLabel(current.value)}
            {'\n'}
            {current.suit}
          </Text>
        </View>

        {gameOver ? (
          <TouchableOpacity style={styles.restartButton} onPress={restart} activeOpacity={0.8}>
            <Text style={styles.restartText}>لعبة جديدة</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.guessRow}>
            <TouchableOpacity
              style={[styles.guessButton, { backgroundColor: C.success }]}
              onPress={() => guess('higher')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
              <Text style={styles.guessText}>أعلى</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.guessButton, { backgroundColor: C.danger }]}
              onPress={() => guess('lower')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-down" size={20} color="#fff" />
              <Text style={styles.guessText}>أقل</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  statChip: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statLabel: { color: C.sub, fontSize: 11 },
  statValue: { color: C.gold, fontSize: 20, fontWeight: '800', marginTop: 2 },
  status: { fontSize: 17, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  cardBox: {
    width: 160,
    height: 220,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  cardText: { color: C.text, fontSize: 40, fontWeight: '900', textAlign: 'center' },
  guessRow: { flexDirection: 'row', gap: 16 },
  guessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 24,
  },
  guessText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  restartButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  restartText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
