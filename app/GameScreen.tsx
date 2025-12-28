import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Accelerometer } from 'expo-sensors';
import { setStatusBarHidden } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Category } from './(tabs)/index';


interface Props { 
  category: Category; lang: 'tr' | 'en'; onQuit: () => void;
  teamMode: { team1: string, team2: string, maxRounds: number, isTeamMode: boolean };
  initialTotalScores: { t1: number, t2: number };
  initialRound: number;
  onRoundComplete: (scores: { t1: number, t2: number }, nextRound: number, finished: boolean) => void;
}

export default function GameScreen({ category, lang, onQuit, teamMode, initialTotalScores, initialRound, onRoundComplete }: Props) {
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'roundSummary'>('countdown');
  const [isPaused, setIsPaused] = useState(false);
  const [count, setCount] = useState(3);
  const [timer, setTimer] = useState(60);
  const [wordIndex, setWordIndex] = useState(0);
  const [turn, setTurn] = useState<'t1' | 't2'>('t1');
  const [roundHistory, setRoundHistory] = useState<{word: string, result: 'correct' | 'pass'}[]>([]);
  const [status, setStatus] = useState<'ready' | 'correct' | 'pass'>('ready');
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  
  const statusRef = useRef(status);
  const lastTap = useRef(0);
  const touchStartX = useRef(0);

  useEffect(() => { statusRef.current = status; }, [status]);

  async function playSound(type: 'correct' | 'pass' | 'finish') {
    try {
      let source = type === 'correct' ? require('../assets/images/sounds/correct.mp3') : 
                   type === 'pass' ? require('../assets/images/sounds/pass.mp3') : 
                   require('../assets/images/sounds/finish.mp3');
      const { sound } = await Audio.Sound.createAsync(source);
      await sound.playAsync();
    } catch (e) {}
  }

  const triggerAction = (type: 'correct' | 'pass') => {
    if (statusRef.current !== 'ready' || gameState !== 'playing' || isPaused) return;
    const word = shuffledWords[wordIndex];
    setStatus(type);
    playSound(type);
    setRoundHistory(prev => [...prev, { word, result: type }]);
  };

  const handleTouchStart = (e: any) => { touchStartX.current = e.nativeEvent.pageX; };

  const handleTouchEnd = (e: any) => {
    if (gameState !== 'playing' || isPaused || statusRef.current !== 'ready') return;
    const dx = e.nativeEvent.pageX - touchStartX.current;
    if (Math.abs(dx) > 60) { triggerAction('pass'); return; }
    const now = Date.now();
    if (now - lastTap.current < 300) { triggerAction('correct'); }
    lastTap.current = now;
  };

  useEffect(() => {
  const start = async () => {
    try {
      // 1. Üstteki saat/pil çubuğunu gizle
      setStatusBarHidden(true, 'fade');

      // 2. Alttaki navigasyon tuşlarını Android'de gizle ve "Sürükleyici Mod"u aç
      if (Platform.OS === 'android') {
        await NavigationBar.setVisibilityAsync("hidden");
        // 'as any' ekleyerek TypeScript hatasını engelliyoruz
        await NavigationBar.setBehaviorAsync("sticky-immersive" as any);
      }

      // 3. Ekranı yatay moda kilitle
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
      
      // 4. Kelimeleri karıştır
      setShuffledWords([...category.words[lang]].sort(() => Math.random() - 0.5));
    } catch (error) {
      console.log("Navigasyon ayarları yüklenirken hata oluştu:", error);
    }
  };

  start();

  // Donanım geri tuşunu oyun içinde pasifize et/yönet
  const bh = BackHandler.addEventListener('hardwareBackPress', () => { 
    onQuit(); 
    return true; 
  });

  return () => { 
    bh.remove(); 
    // Oyundan çıkınca her şeyi eski (dikey ve görünür) haline getir
    setStatusBarHidden(false, 'fade');
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync("visible");
    }
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); 
  };
}, [category, lang, onQuit]);


  useEffect(() => {
    let interval: any;
    if (gameState === 'countdown' && !isPaused) {
      interval = setInterval(() => { setCount(c => { if (c <= 1) { setGameState('playing'); return 0; } return c - 1; }); }, 1000);
    } else if (gameState === 'playing' && !isPaused) {
      interval = setInterval(() => { 
        setTimer(t => { 
          if (t <= 1) { playSound('finish'); setGameState('roundSummary'); return 0; } 
          return t - 1; 
        }); 
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, isPaused]);

  useEffect(() => {
    let sub: any;
    if (gameState === 'playing' && !isPaused) {
      sub = Accelerometer.addListener(({ z }) => {
        if (z < -0.75 && statusRef.current === 'ready') triggerAction('correct');
        else if (z > 0.75 && statusRef.current === 'ready') triggerAction('pass');
        else if (z > -0.3 && z < 0.3 && statusRef.current !== 'ready') { 
          setStatus('ready'); setWordIndex(p => (p + 1) % shuffledWords.length); 
        }
      });
      Accelerometer.setUpdateInterval(100);
    }
    return () => sub && sub.remove();
  }, [gameState, isPaused, shuffledWords, wordIndex]);

  const handleNextAction = () => {
    const correctCount = roundHistory.filter(h => h.result === 'correct').length;
    const currentScores = { ...initialTotalScores, [turn]: initialTotalScores[turn] + correctCount };
    if (!teamMode.isTeamMode) onRoundComplete(currentScores, 1, true);
    else {
      if (turn === 't1') {
        setTurn('t2'); setRoundHistory([]); setTimer(60); setCount(3); setWordIndex(0); setGameState('countdown');
      } else {
        onRoundComplete(currentScores, initialRound + 1, initialRound === teamMode.maxRounds);
      }
    }
  };

  // DOĞRU VE PAS SAYILARI HESAPLAMA
  const correctCount = roundHistory.filter(h => h.result === 'correct').length;
  const passCount = roundHistory.filter(h => h.result === 'pass').length;

  if (gameState === 'roundSummary') return (
    <View style={styles.resContainer}>
      <Text style={styles.resTitle}>{lang === 'tr' ? 'TUR ÖZETİ' : 'ROUND SUMMARY'}</Text>
      
      {/* İSTATİSTİK ROZETLERİ */}
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, {backgroundColor: '#2ecc71'}]}>
           <Text style={styles.statLabel}>{lang === 'tr' ? 'DOĞRU' : 'CORRECT'}</Text>
           <Text style={styles.statValue}>{correctCount}</Text>
        </View>
        <View style={[styles.statBadge, {backgroundColor: '#e74c3c'}]}>
           <Text style={styles.statLabel}>{lang === 'tr' ? 'PAS' : 'PASS'}</Text>
           <Text style={styles.statValue}>{passCount}</Text>
        </View>
      </View>

      <ScrollView style={{width: '85%', marginVertical: 10}} showsVerticalScrollIndicator={false}>
        {roundHistory.map((item, idx) => (
          <View key={idx} style={styles.historyRow}>
            <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>{item.word.toUpperCase()}</Text>
            <Text style={{fontSize: 20}}>{item.result === 'correct' ? '✅' : '❌'}</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.btn} onPress={handleNextAction}>
        <Text style={styles.btnText}>
           {teamMode.isTeamMode && turn === 't1' ? (lang === 'tr' ? 'SIRADAKİ TAKIM' : 'NEXT TEAM') : (lang === 'tr' ? 'DEVAM' : 'CONTINUE')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View 
      style={{flex: 1}} 
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTouchStart}
      onResponderRelease={handleTouchEnd}
    >
      <LinearGradient 
        colors={status === 'correct' ? ['#2ecc71', '#27ae60'] : status === 'pass' ? ['#e74c3c', '#c0392b'] : ['#6c5ce7', '#a29bfe']} 
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsPaused(true)} style={styles.pauseBtn}><Ionicons name="pause" size={28} color="white" /></TouchableOpacity>
          <Text style={styles.infoText}>
            {teamMode.isTeamMode ? `${turn === 't1' ? teamMode.team1 : teamMode.team2} | ` : ''} 
            {lang === 'tr' ? 'Tur' : 'Round'}: {initialRound}
          </Text>
          <Text style={styles.timer}>{timer}</Text>
        </View>
        
        <View style={styles.wordBox} pointerEvents="none"> 
          <Text style={styles.wordText}>
            {gameState === 'countdown' ? count : (status === 'correct' ? (lang === 'tr' ? 'DOĞRU' : 'CORRECT') : status === 'pass' ? (lang === 'tr' ? 'PAS' : 'PASS') : shuffledWords[wordIndex]?.toUpperCase())}
          </Text>
        </View>

        <Modal visible={isPaused} transparent={true} animationType="fade">
          <View style={styles.overlay}><View style={styles.pauseCard}>
              <TouchableOpacity onPress={() => setIsPaused(false)} style={styles.btn}><Text style={styles.btnText}>{lang === 'tr' ? 'DEVAM ET' : 'RESUME'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={onQuit} style={[styles.btn, {marginTop: 12, backgroundColor: '#e74c3c'}]}><Text style={styles.btnText}>{lang === 'tr' ? 'ÇIK' : 'QUIT'}</Text></TouchableOpacity>
          </View></View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { position: 'absolute', top: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  pauseBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 15 },
  infoText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  timer: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  wordBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 45, borderRadius: 30, width: '85%', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  wordText: { 
    fontSize: 55, 
    color: 'white', 
    fontWeight: '900', 
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 6,
    letterSpacing: 2,
  },
  resContainer: { flex: 1, backgroundColor: '#1e272e', padding: 20, alignItems: 'center' },
  resTitle: { color: '#fdcb6e', fontSize: 26, fontWeight: 'bold', marginBottom: 15 },
  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 15 },
  statBadge: { padding: 12, borderRadius: 20, alignItems: 'center', minWidth: 100 },
  statLabel: { color: 'white', fontSize: 12, fontWeight: 'bold', opacity: 0.9 },
  statValue: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#2f3542', width: '100%' },
  btn: { backgroundColor: '#6c5ce7', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 25 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  pauseCard: { backgroundColor: '#2d3436', padding: 40, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: '#6c5ce7' }
});