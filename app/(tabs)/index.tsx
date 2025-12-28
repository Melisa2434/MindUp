import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CategoryScreen from '../CategoryScreen';
import GameScreen from '../GameScreen';

export interface Category {
  id: string;
  title: { tr: string; en: string };
  color: string;
  words: { tr: string[]; en: string[] };
}

export default function HomeScreen() {
  // Splash Ekran State'i
  const [isSplashActive, setIsSplashActive] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Oyun State'leri
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [teams, setTeams] = useState({ t1: '', t2: '' });
  const [maxRounds, setMaxRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalScores, setTotalScores] = useState({ t1: 0, t2: 0 });
  const [isGameOver, setIsGameOver] = useState(false);

  // Açılış Animasyonu Yönetimi
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      setIsSplashActive(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  // Ekran Oryantasyonu Yönetimi
  useEffect(() => {
    if (!selectedCategory) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, [selectedCategory]);

  const t = {
    tr: { teamMode: "Takım Savaşı", soloMode: "Tekli Oyun", t1: "1. Takım", t2: "2. Takım", rounds: "Tur", final: "OYUN SONUCU" },
    en: { teamMode: "Team Battle", soloMode: "Solo Play", t1: "Team 1", t2: "Team 2", rounds: "Rounds", final: "FINAL RESULTS" }
  }[language];

  const resetAll = () => {
    setSelectedCategory(null);
    setCurrentRound(1);
    setTotalScores({ t1: 0, t2: 0 });
    setIsGameOver(false);
  };

  // 1. ADIM: Karşılama Ekranı (Splash)
  if (isSplashActive) {
    return (
      <LinearGradient colors={['#6c5ce7', '#a29bfe']} style={styles.splashContainer}>
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Ionicons name="bulb-outline" size={100} color="white" />
          <Text style={styles.splashTitle}>MindUp</Text>
          <Text style={styles.splashSubtitle}>Alnındakini Tahmin Et!</Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  // 2. ADIM: Kazanan Ekranı
  if (isGameOver) {
    const winner = totalScores.t1 > totalScores.t2 ? (teams.t1 || "Takım 1") : (teams.t2 || "Takım 2");
    return (
      <LinearGradient colors={['#1e272e', '#485460']} style={styles.fullCenter}>
        <Text style={styles.finalTitle}>{t.final}</Text>
        <Text style={styles.winnerName}>{totalScores.t1 === totalScores.t2 ? "BERABERE!" : winner.toUpperCase()}</Text>
        <View style={styles.finalScoreRow}>
          <Text style={styles.scoreDetail}>{teams.t1 || "T1"}: {totalScores.t1}</Text>
          <Text style={styles.scoreDetail}> | </Text>
          <Text style={styles.scoreDetail}>{teams.t2 || "T2"}: {totalScores.t2}</Text>
        </View>
        <TouchableOpacity style={styles.bigBtn} onPress={resetAll}><Text style={styles.btnText}>BAŞTAN BAŞLA</Text></TouchableOpacity>
      </LinearGradient>
    );
  }

  // 3. ADIM: Oyun Ekranı
  if (selectedCategory) {
    return (
      <GameScreen 
        category={selectedCategory} 
        lang={language}
        onQuit={resetAll} 
        initialTotalScores={totalScores}
        initialRound={currentRound}
        teamMode={{
          team1: teams.t1 || (language === 'tr' ? "Takım 1" : "Team 1"),
          team2: teams.t2 || (language === 'tr' ? "Takım 2" : "Team 2"),
          maxRounds: isTeamMode ? maxRounds : 1,
          isTeamMode: isTeamMode
        }}
        onRoundComplete={(scores: any, nextRound: any, finished: any) => {
          setTotalScores(scores);
          setCurrentRound(nextRound);
          setSelectedCategory(null);
          if (finished) setIsGameOver(true);
        }}
      />
    );
  }

  // 4. ADIM: Ana Kategori Seçim Ekranı
  return (
    <LinearGradient colors={['#1e272e', '#485460']} style={{flex: 1}}>
      <SafeAreaView style={styles.container}>
        <CategoryScreen 
          lang={language} 
          onSelectCategory={(cat) => setSelectedCategory(cat)} 
          headerComponent={
            <View style={styles.headerContainer}>
              <View style={styles.langBar}>
                {['tr', 'en'].map((l) => (
                  <TouchableOpacity key={l} onPress={() => setLanguage(l as any)} style={[styles.smallBtn, language === l && styles.activeBtn]}>
                    <Text style={styles.btnText}>{l.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {currentRound === 1 && (
                <View style={styles.modeContainer}>
                  <TouchableOpacity onPress={() => setIsTeamMode(false)} style={[styles.modeBtn, !isTeamMode && styles.soloActive]}>
                    <Text style={styles.outlineText}>{t.soloMode}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsTeamMode(true)} style={[styles.modeBtn, isTeamMode && styles.teamActive]}>
                    <Text style={styles.outlineText}>{t.teamMode}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isTeamMode && currentRound === 1 && (
                <LinearGradient colors={['#3d3d3d', '#57606f']} style={styles.teamCard}>
                  <View style={styles.inputRow}>
                    <TextInput style={styles.premiumInput} placeholder={t.t1} placeholderTextColor="#a4b0be" value={teams.t1} onChangeText={(txt) => setTeams(prev => ({...prev, t1: txt}))} />
                    <Text style={styles.vsBadge}>VS</Text>
                    <TextInput style={styles.premiumInput} placeholder={t.t2} placeholderTextColor="#a4b0be" value={teams.t2} onChangeText={(txt) => setTeams(prev => ({...prev, t2: txt}))} />
                  </View>
                  <View style={styles.roundPicker}>
                    <Text style={styles.outlineText}>{t.rounds}: {maxRounds}</Text>
                    <View style={{flexDirection:'row', gap: 6}}>
                      {[1, 2, 3, 4, 5].map(r => (
                        <TouchableOpacity key={r} onPress={() => setMaxRounds(r)} style={[styles.roundCircle, maxRounds === r && styles.activeBtn]}>
                          <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </LinearGradient>
              )}

              {currentRound > 1 && (
                <View style={styles.roundBanner}>
                  <Text style={styles.bannerText}>TUR {currentRound} - KATEGORİ SEÇİN</Text>
                  <Text style={styles.miniScore}>{teams.t1 || "T1"}: {totalScores.t1} | {teams.t2 || "T2"}: {totalScores.t2}</Text>
                </View>
              )}
            </View>
          } 
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { padding: 20 },
  langBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 10 },
  smallBtn: { padding: 8, borderRadius: 12, backgroundColor: '#2f3542', borderWidth: 1, borderColor: '#57606f' },
  modeContainer: { flexDirection: 'row', backgroundColor: '#2f3542', borderRadius: 20, padding: 5, marginBottom: 15, borderWidth: 1, borderColor: '#57606f' },
  modeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 16 },
  activeBtn: { backgroundColor: '#6c5ce7', borderColor: '#a29bfe', borderWidth: 1 },
  soloActive: { backgroundColor: '#3498db' },
  teamActive: { backgroundColor: '#e67e22' },
  outlineText: { color: 'white', fontWeight: 'bold', textShadowColor: 'black', textShadowRadius: 1 },
  btnText: { color: 'white', fontWeight: 'bold' },
  teamCard: { padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#747d8c' },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  premiumInput: { flex: 0.46, backgroundColor: '#2f3542', borderRadius: 12, padding: 10, color: 'white', borderWidth: 1, borderColor: '#57606f' },
  vsBadge: { fontWeight: '900', color: '#ff4757', fontSize: 16 },
  roundPicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2f3542', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#57606f' },
  roundBanner: { backgroundColor: '#6c5ce7', padding: 15, borderRadius: 15, alignItems: 'center' },
  bannerText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  miniScore: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 5 },
  fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  finalTitle: { color: '#fdcb6e', fontSize: 24, fontWeight: 'bold' },
  winnerName: { color: 'white', fontSize: 45, fontWeight: '900', marginVertical: 20, textAlign: 'center' },
  finalScoreRow: { flexDirection: 'row', marginBottom: 40 },
  scoreDetail: { color: 'white', fontSize: 20 },
  bigBtn: { backgroundColor: '#6c5ce7', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 },
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashTitle: { fontSize: 48, fontWeight: '900', color: 'white', marginTop: 20, letterSpacing: 2 },
  splashSubtitle: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: 10, fontWeight: '500' }
});