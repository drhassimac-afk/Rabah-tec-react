import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSocket } from '../src/api/socket';

const C = {
  bg: '#0B1120',
  surface: '#161F2E',
  border: '#243044',
  primary: '#A855F7',
  text: '#FFFFFF',
  sub: '#94A3B8',
  muted: '#64748B',
  gold: '#FACC15',
  danger: '#EF4444',
  success: '#22C55E',
};

const EMOJIS = ['🍎', '🍌', '🍇', '🍉', '🍒', '🥝', '🍓', '🍑'];

type MemoryCard = {
  id: string;
  emoji: string;
  flipped: boolean;
  matched: boolean;
};

function shuffledDeck(): MemoryCard[] {
  const pairs = [...EMOJIS, ...EMOJIS];

  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }

  return pairs.map((emoji, index) => ({
    id: `${index}-${emoji}`,
    emoji,
    flipped: false,
    matched: false,
  }));
}

function CardTile({
  card,
  onPress,
  disabled,
}: {
  card: MemoryCard;
  onPress: () => void;
  disabled: boolean;
}) {
  const flip = useRef(
    new Animated.Value(card.flipped || card.matched ? 1 : 0)
  ).current;

  const wasOpen = useRef(card.flipped || card.matched);

  useEffect(() => {
    const isOpen = card.flipped || card.matched;

    if (isOpen !== wasOpen.current) {
      Animated.spring(flip, {
        toValue: isOpen ? 1 : 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 8,
      }).start();

      wasOpen.current = isOpen;
    }
  }, [card.flipped, card.matched, flip]);

  const scale = flip.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.85, 1],
  });

  return (
    <TouchableOpacity
      style={styles.cardOuter}
      activeOpacity={0.8}
      disabled={disabled || card.flipped || card.matched}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.card,
          card.matched && styles.cardMatched,
          (card.flipped || card.matched) && styles.cardOpen,
          { transform: [{ scale }] },
        ]}
      >
        <Text style={styles.cardText}>
          {card.flipped || card.matched ? card.emoji : '❔'}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function MemoryGameScreen() {
  const socket = useRef(getSocket());

  const [cards, setCards] = useState<MemoryCard[]>(shuffledDeck);
  const [flippedIdx, setFlippedIdx] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [won, setWon] = useState(false);
  const [locked, setLocked] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    timerRef.current = setInterval(() => {
      setSeconds((sec) => sec + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fade]);

  useEffect(() => {
    const matchedCount = cards.filter((card) => card.matched).length;

    if (matchedCount === cards.length && !won) {
      setWon(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      Vibration.vibrate([0, 40, 60, 40]);

      const points = Math.max(20, 100 - moves * 3);

      socket.current?.emit('game_score_submit', {
        points,
        game: 'memory',
      });
    }
  }, [cards, moves, won]);

  const onCardPress = useCallback(
    (index: number) => {
      if (locked || cards[index]?.matched || cards[index]?.flipped) {
        return;
      }

      setCards((prev) =>
        prev.map((card, i) =>
          i === index ? { ...card, flipped: true } : card
        )
      );

      setFlippedIdx((prev) => {
        const next = [...prev, index];

        if (next.length === 2) {
          setLocked(true);
          setMoves((m) => m + 1);

          const [a, b] = next;

          setTimeout(() => {
            setCards((current) => {
              const isMatch =
                current[a].emoji === current[b].emoji;

              return current.map((card, i) => {
                if (i === a || i === b) {
                  return isMatch
                    ? { ...card, matched: true, flipped: false }
                    : { ...card, flipped: false };
                }

                return card;
              });
            });

            setFlippedIdx([]);
            setLocked(false);
          }, 650);
        }

        return next.length === 2 ? [] : next;
      });
    },
    [locked, cards]
  );

  const restart = () => {
    setCards(shuffledDeck());
    setFlippedIdx([]);
    setMoves(0);
    setSeconds(0);
    setWon(false);
    setLocked(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setSeconds((sec) => sec + 1);
    }, 1000);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
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

        <Text style={styles.headerTitle}>ذاكرة</Text>

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

      <Animated.View style={[styles.body, { opacity: fade }]}>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons
              name="footsteps"
              size={14}
              color={C.sub}
            />
            <Text style={styles.statText}>
              {moves} حركة
            </Text>
          </View>

          <View style={styles.statChip}>
            <Ionicons
              name="time"
              size={14}
              color={C.sub}
            />
            <Text style={styles.statText}>
              {mm}:{ss}
            </Text>
          </View>
        </View>

        {won ? (
          <View style={styles.winBox}>
            <Ionicons
              name="trophy"
              size={54}
              color={C.gold}
            />

            <Text style={styles.winTitle}>
              أحسنت! 🎉
            </Text>

            <Text style={styles.winSub}>
              أنهيت اللعبة في {moves} حركة و {mm}:{ss}
            </Text>

            <TouchableOpacity
              style={styles.restartButton}
              onPress={restart}
            >
              <Text style={styles.restartText}>
                لعبة جديدة
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {cards.map((card, index) => (
              <CardTile
                key={card.id}
                card={card}
                disabled={locked}
                onPress={() => onCardPress(index)}
              />
            ))}
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const CARD_SIZE = 72;

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
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 20,
  },
  statChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  statText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    maxWidth: (CARD_SIZE + 10) * 4,
  },
  cardOuter: {
    width: CARD_SIZE,
    height: CARD_SIZE,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOpen: {
    borderColor: C.primary,
    backgroundColor: '#241B3D',
  },
  cardMatched: {
    borderColor: C.success,
    backgroundColor: '#123626',
  },
  cardText: {
    fontSize: 30,
  },
  winBox: {
    alignItems: 'center',
    marginTop: 60,
    gap: 8,
  },
  winTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  winSub: {
    color: C.sub,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  restartButton: {
    marginTop: 24,
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  restartText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
