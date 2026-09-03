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
  primary: '#22C55E',
  text: '#FFFFFF',
  sub: '#94A3B8',
  muted: '#64748B',
  gold: '#FACC15',
  danger: '#EF4444',
  success: '#22C55E',
};

type Question = {
  q: string;
  options: string[];
  correct: number;
};

const QUESTIONS: Question[] = [
  {
    q: 'ما هي عاصمة الجزائر؟',
    options: ['الجزائر العاصمة', 'وهران', 'قسنطينة', 'عنابة'],
    correct: 0,
  },
  {
    q: 'كم عدد قارات العالم؟',
    options: ['5', '6', '7', '8'],
    correct: 2,
  },
  {
    q: 'ما هو أطول نهر في العالم؟',
    options: ['الأمازون', 'النيل', 'دجلة', 'الفرات'],
    correct: 1,
  },
  {
    q: 'كم عدد أيام السنة الكبيسة؟',
    options: ['364', '365', '366', '367'],
    correct: 2,
  },
  {
    q: 'ما هو أكبر محيط في العالم؟',
    options: ['الأطلسي', 'الهندي', 'الهادئ', 'المتجمد الشمالي'],
    correct: 2,
  },
  {
    q: 'من مؤلف رواية "الأمير الصغير"؟',
    options: [
      'فيكتور هوغو',
      'أنطوان دو سانت إكزوبيري',
      'ألبير كامو',
      'جول فيرن',
    ],
    correct: 1,
  },
  {
    q: 'ما هو العنصر الكيميائي الذي رمزه O؟',
    options: ['الذهب', 'الأكسجين', 'الأوزون', 'الحديد'],
    correct: 1,
  },
  {
    q: 'كم عدد اللاعبين في فريق كرة القدم الواحد؟',
    options: ['9', '10', '11', '12'],
    correct: 2,
  },
  {
    q: 'ما هي أكبر دولة من حيث المساحة؟',
    options: ['الصين', 'كندا', 'روسيا', 'أمريكا'],
    correct: 2,
  },
  {
    q: 'في أي قارة تقع مصر؟',
    options: ['آسيا', 'أفريقيا', 'أوروبا', 'أمريكا الجنوبية'],
    correct: 1,
  },
];

function shuffled(arr: Question[]) {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export default function QuizGameScreen() {
  const sock = useRef(getSocket());

  const [questions] = useState(() =>
    shuffled(QUESTIONS).slice(0, 8),
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const scoreSubmitted = useRef(false);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  useEffect(() => {
    if (finished && !scoreSubmitted.current) {
      scoreSubmitted.current = true;

      sock.current?.emit('game_score_submit', {
        points: score * 10,
        game: 'quiz',
      });
    }
  }, [finished, score]);

  const current = questions[index];

  const answer = (optIndex: number) => {
    if (selected !== null || !current) return;

    setSelected(optIndex);
    setShowResult(true);

    if (optIndex === current.correct) {
      Vibration.vibrate(15);
      setScore((sc) => sc + 1);
    } else {
      Vibration.vibrate([0, 30, 40, 30]);
    }

    setTimeout(() => {
      if (index + 1 >= questions.length) {
        setFinished(true);
      } else {
        setIndex((i) => i + 1);
        setSelected(null);
        setShowResult(false);
      }
    }, 900);
  };

  const restart = () => {
    setIndex(0);
    setScore(0);
    setSelected(null);
    setShowResult(false);
    setFinished(false);
    scoreSubmitted.current = false;
  };

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

        <Text style={s.headerTitle}>مسابقة</Text>

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
        {finished ? (
          <View style={s.winBox}>
            <Ionicons
              name="trophy"
              size={54}
              color={C.gold}
            />

            <Text style={s.winTitle}>
              انتهت المسابقة! 🎉
            </Text>

            <Text style={s.winSub}>
              أجبت صح على {score} من {questions.length} أسئلة
            </Text>

            <TouchableOpacity
              style={s.restartBtn}
              onPress={restart}
            >
              <Text style={s.restartTxt}>
                مسابقة جديدة
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.progressRow}>
              <Text style={s.progressTxt}>
                {index + 1} / {questions.length}
              </Text>

              <Text style={s.scoreTxt}>
                النقاط: {score}
              </Text>
            </View>

            <View style={s.progressTrack}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${
                      ((index + 1) / questions.length) * 100
                    }%`,
                  },
                ]}
              />
            </View>

            <Text style={s.question}>
              {current.q}
            </Text>

            <View style={s.options}>
              {current.options.map((opt, i) => {
                let bg = C.surface;
                let border = C.border;

                if (showResult) {
                  if (i === current.correct) {
                    bg = '#123626';
                    border = C.success;
                  } else if (i === selected) {
                    bg = '#3D0F14';
                    border = C.danger;
                  }
                }

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      s.optionBtn,
                      {
                        backgroundColor: bg,
                        borderColor: border,
                      },
                    ]}
                    onPress={() => answer(i)}
                    disabled={selected !== null}
                  >
                    <Text style={s.optionTxt}>
                      {opt}
                    </Text>

                    {showResult &&
                      i === current.correct && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={C.success}
                        />
                      )}

                    {showResult &&
                      i === selected &&
                      i !== current.correct && (
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={C.danger}
                        />
                      )}
                  </TouchableOpacity>
                );
              })}
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
    fontSize: 18,
    fontWeight: '800',
  },

  body: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  progressRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  progressTxt: {
    color: C.sub,
    fontSize: 13,
    fontWeight: '700',
  },

  scoreTxt: {
    color: C.gold,
    fontSize: 13,
    fontWeight: '700',
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.surface,
    overflow: 'hidden',
    marginBottom: 28,
  },

  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },

  question: {
    color: C.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 24,
    lineHeight: 28,
  },

  options: {
    gap: 12,
  },

  optionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  optionTxt: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
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
