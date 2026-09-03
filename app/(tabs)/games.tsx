import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSocket } from '../../src/api/socket';

type Game = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  rating: number;
};

type LeaderboardEntry = {
  name: string;
  points: number;
  games?: Record<string, number>;
};

const GAMES: Game[] = [
  {
    id: 'memory',
    title: 'ذاكرة',
    subtitle: 'اختبر ذاكرتك',
    emoji: '🧠',
    color: '#A855F7',
    rating: 4.2,
  },
  {
    id: 'xo',
    title: 'إكس أو',
    subtitle: 'اللعبة الكلاسيكية للاعبين',
    emoji: '⭕',
    color: '#3B82F6',
    rating: 4.5,
  },
  {
    id: 'cards',
    title: 'ورق',
    subtitle: 'أعلى ولا أقل',
    emoji: '🃏',
    color: '#EF4444',
    rating: 4.3,
  },
  {
    id: 'quiz',
    title: 'مسابقة',
    subtitle: 'أسئلة عامة',
    emoji: '❓',
    color: '#22C55E',
    rating: 4.7,
  },
  {
    id: '2048',
    title: '2048',
    subtitle: 'ادمج الأرقام واربح',
    emoji: '🔢',
    color: '#F59E0B',
    rating: 4.6,
  },
  {
    id: 'chess',
    title: 'شطرنج',
    subtitle: 'تحدَّ خصمك',
    emoji: '♟️',
    color: '#8B5CF6',
    rating: 4.8,
  },
];

function openGame(id: string) {
  router.push(`/${id}` as never);
}

export default function GamesScreen() {
  const [onlineCount, setOnlineCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const updateOnline = (users: unknown) => {
      if (Array.isArray(users)) {
        setOnlineCount(users.length);
      }
    };

    const updateLeaderboard = (data: {
      leaderboard?: LeaderboardEntry[];
    }) => {
      setLeaderboard(Array.isArray(data?.leaderboard) ? data.leaderboard : []);
    };

    const onInit = (data: { onlineUsers?: unknown }) => {
      updateOnline(data?.onlineUsers);
    };

    socket.on('init', onInit);
    socket.on('onlineUsers', updateOnline);
    socket.on('leaderboard_update', updateLeaderboard);

    socket.emit('get_leaderboard');

    return () => {
      socket.off('init', onInit);
      socket.off('onlineUsers', updateOnline);
      socket.off('leaderboard_update', updateLeaderboard);
    };
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>الألعاب</Text>
            <Text style={styles.subtitle}>استمتع وتحدَّ أصدقاءك</Text>
          </View>

          <View style={styles.trophy}>
            <Ionicons name="trophy" size={24} color="#FBBF24" />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#22C55E22' }]}>
              <Ionicons name="people" size={22} color="#22C55E" />
            </View>
            <View>
              <Text style={styles.statValue}>{onlineCount}</Text>
              <Text style={styles.statLabel}>متصل الآن</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#A855F722' }]}>
              <Ionicons name="game-controller" size={22} color="#A855F7" />
            </View>
            <View>
              <Text style={styles.statValue}>{GAMES.length}</Text>
              <Text style={styles.statLabel}>ألعاب متاحة</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>اختر لعبة</Text>

        <View style={styles.gamesGrid}>
          {GAMES.map((game) => (
            <TouchableOpacity
              key={game.id}
              activeOpacity={0.8}
              style={styles.gameCard}
              onPress={() => openGame(game.id)}
            >
              <View
                style={[
                  styles.gameEmoji,
                  { backgroundColor: `${game.color}22` },
                ]}
              >
                <Text style={styles.emoji}>{game.emoji}</Text>
              </View>

              <Text style={styles.gameTitle}>{game.title}</Text>
              <Text style={styles.gameSubtitle} numberOfLines={2}>
                {game.subtitle}
              </Text>

              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#FBBF24" />
                <Text style={styles.rating}>{game.rating.toFixed(1)}</Text>
              </View>

              <View
                style={[styles.playButton, { backgroundColor: game.color }]}
              >
                <Ionicons name="play" size={15} color="#fff" />
                <Text style={styles.playText}>العب</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.leaderboardHeader}>
          <View>
            <Text style={styles.sectionTitle}>لوحة المتصدرين</Text>
            <Text style={styles.leaderboardSubtitle}>
              أفضل اللاعبين حسب مجموع النقاط
            </Text>
          </View>

          <Ionicons name="podium" size={25} color="#FBBF24" />
        </View>

        <View style={styles.leaderboardCard}>
          {leaderboard.length === 0 ? (
            <View style={styles.emptyLeaderboard}>
              <Ionicons name="trophy-outline" size={38} color="#64748B" />
              <Text style={styles.emptyText}>لا توجد نتائج بعد</Text>
              <Text style={styles.emptyHint}>
                العب إحدى الألعاب لتظهر هنا
              </Text>
            </View>
          ) : (
            leaderboard.slice(0, 10).map((player, index) => (
              <View
                key={`${player.name}-${index}`}
                style={[
                  styles.playerRow,
                  index === leaderboard.length - 1 && styles.lastPlayerRow,
                ]}
              >
                <View style={styles.rank}>
                  <Text
                    style={[
                      styles.rankText,
                      index < 3 && styles.topRankText,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>

                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(player.name || 'م').charAt(0)}
                  </Text>
                </View>

                <View style={styles.playerInfo}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {player.name || 'مستخدم'}
                  </Text>
                  <Text style={styles.playerPoints}>
                    {player.points || 0} نقطة
                  </Text>
                </View>

                {index === 0 && (
                  <Ionicons name="trophy" size={22} color="#FBBF24" />
                )}
                {index === 1 && (
                  <Ionicons name="medal" size={22} color="#CBD5E1" />
                )}
                {index === 2 && (
                  <Ionicons name="medal" size={22} color="#CD7F32" />
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'right',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'right',
  },
  trophy: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FBBF2418',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'right',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 14,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gameCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 2,
  },
  gameEmoji: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 28,
  },
  gameTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  gameSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 17,
    minHeight: 34,
    marginTop: 4,
    textAlign: 'right',
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 9,
    marginBottom: 11,
  },
  rating: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  playButton: {
    height: 36,
    borderRadius: 11,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  playText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  leaderboardHeader: {
    marginTop: 30,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  leaderboardSubtitle: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'right',
    marginTop: -7,
    marginBottom: 14,
  },
  leaderboardCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  emptyLeaderboard: {
    alignItems: 'center',
    paddingVertical: 35,
  },
  emptyText: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyHint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  playerRow: {
    minHeight: 68,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 10,
  },
  lastPlayerRow: {
    borderBottomWidth: 0,
  },
  rank: {
    width: 25,
    alignItems: 'center',
  },
  rankText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '800',
  },
  topRankText: {
    color: '#FBBF24',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '800',
  },
  playerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  playerName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '100%',
  },
  playerPoints: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
  },
  bottomSpace: {
    height: 30,
  },
});
