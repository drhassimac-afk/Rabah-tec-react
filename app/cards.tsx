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

const C = {
  bg: '#0B1120',
  surface: '#161F2E',
  border: '#243044',
  primary: '#EF4444',
  text: '#FFFFFF',
  sub: '#94A3B8',
  muted: '#64748B',
  gold: '#FACC15',
  danger: '#EF4444',
  success: '#22C55E',
};

const SUITS = [
  { symbol: '♠', color: '#E2E8F0' },
  { symbol: '♥', color: '#EF4444' },
  { symbol: '♦', color: '#EF4444' },
  { symbol: '♣', color: '#E2E8F0' },
];

const RANK_LABELS = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

type Card = {
  rank: number;
  label: string;
  suit: {
    symbol: string;
    color: string;
  };
};

function drawCard(): Card {
  const rank = Math.floor(Math.random() * 13);
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];

  return {
    rank,
    label: RANK_LABELS[rank],
    suit,
  };
}

function CardFace({ card }: { card: Card | null }) {
  if (!card) {
    return <View style={s.cardFace} />;
  }

  return (
    <View style={s.cardFace}>
      <Text style={[s.cardRank, { color: card.suit.color }]}>
        {card.label}
      </Text>

      <Text style={[s.cardSuit, { color: card.suit.color }]}>
        {card.suit.symbol}
      </Text>
    </View>
  );
}

export default function CardsGameScreen() {
  const sock = useRef(getSocket());

  const [current, setCurrent] = useState<Card>(drawCard);
  const [next, setNext] = useState<Card | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const scoreSubmitted = useRef(false);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const guess = (direction: 'higher' | 'lower') => {
    if (busy || gameOver) return;

    setBusy(true);

    const drawn = drawCard();
    setNext(drawn);

    Animated.sequence([
      Animated.timing(flip, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const correct =
        (direction === 'higher' && drawn.rank >= current.rank) ||
        (direction === 'lower' && drawn.rank <= current.rank);

      if (correct) {
        Vibration.vibrate(15);

        setStreak((st) => {
          const ns = st + 1;
          setBest((b) => Math.max(b, ns));
          return ns;
        });

        setCurrent(drawn);
        setNext(null);
        flip.setValue(0);
        setBusy(false);
      } else {
        Vibration.vibrate([0, 30, 40, 30]);
        setGameOver(true);
        setBusy(false);
      }
    });
  };

  useEffect(() => {
    if (
      gameOver &&
      !scoreSubmitted.current &&
      streak > 0
    ) {
      scoreSubmitted.current = true;

      sock.current?.emit('game_score_submit', {
        points: streak * 10,
        game: 'cards',
      });
    }
  }, [gameOver, streak]);

  const restart = () => {
    setCurrent(drawCard());
    setNext(null);
    setStreak(0);
    setGameOver(false);
    setBusy(false);
    scoreSubmitted.current = false;
    flip.setValue(0);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="arrow-forward"
            size={24}
            color={C.sub}
          />
        </TouchableOpacity>

        <Text style={s.headerTitle}>
          ورق — أعلى ولا أقل
        </Text>

        <TouchableOpacity
          onPress={restart}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Ionicons
              name="flame"
              size={14}
              color={C.gold}
            />
            <Text style={s.statTxt}>
              السلسلة: {streak}
            </Text>
          </View>

          <View style={s.statChip}>
            <Ionicons
              name="trophy"
              size={14}
              color={C.sub}
            />
            <Text style={s.statTxt}>
              الأفضل: {best}
            </Text>
          </View>
        </View>

        {gameOver ? (
          <View style={s.winBox}>
            <Ionicons
              name="close-circle"
              size={54}
              color={C.danger}
            />

            <Text style={s.winTitle}>
              انتهت اللعبة
            </Text>

            <Text style={s.winSub}>
              وصلت لسلسلة {streak} تخمين صحيح متتالي
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
          <>
            <View style={s.cardsRow}>
              <CardFace card={current} />

              <Ionicons
                name="arrow-back"
                size={22}
                color={C.sub}
              />

              <CardFace card={next} />
            </View>

            <Text style={s.question}>
              الورقة الجاية هتكون أعلى ولا أقل؟
            </Text>

            <View style={s.btnRow}>
              <TouchableOpacity
                style={[
                  s.guessBtn,
                  {
                    backgroundColor: C.success,
                  },
                ]}
                onPress={() => guess('higher')}
                disabled={busy}
              >
                <Ionicons
                  name="arrow-up"
                  size={22}
                  color="#fff"
                />

                <Text style={s.guessTxt}>
                  أعلى
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.guessBtn,
                  {
                    backgroundColor: C.danger,
                  },
                ]}
                onPress={() => guess('lower')}
                disabled={busy}
              >
                <Ionicons
                  name="arrow-down"
                  size={22}
                  color="#fff"
                />

                <Text style={s.guessTxt}>
                  أقل
                </Text>
              </TouchableOpacity>
            </View>
          </>
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
    fontSize: 16,
    fontWeight: '800',
  },

  body: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
  },

  statsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 30,
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

  statTxt: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },

  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 30,
  },

  cardFace: {
    width: 96,
    height: 136,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.border,
  },

  cardRank: {
    fontSize: 30,
    fontWeight: '900',
  },

  cardSuit: {
    fontSize: 26,
    marginTop: 4,
  },

  question: {
    color: C.sub,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },

  btnRow: {
    flexDirection: 'row',
    gap: 16,
  },

  guessBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },

  guessTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  winBox: {
    alignItems: 'center',
    marginTop: 40,
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

  restartBtn: {
    marginTop: 24,
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },

  restartTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
