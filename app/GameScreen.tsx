import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const start = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
      setShuffledWords([...category.words[lang]].sort(() => Math.random() - 0.5));
    };
    start();
    const bh = BackHandler.addEventListener('hardwareBackPress', () => { onQuit(); return true; });
    return () => { bh.remove(); ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); };
  }, [category]);

  useEffect(() => {
    let interval: any;
    if (gameState === 'countdown' && !isPaused) {
      interval = setInterval(() => { setCount(c => { if (c <= 1) { setGameState('playing'); return 0; } return c - 1; }); }, 1000);
    } else if (gameState === 'playing' && !isPaused) {
      interval = setInterval(() => { setTimer(t => { if (t <= 1) { setGameState('roundSummary'); return 0; } return t - 1; }); }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, isPaused]);

  useEffect(() => {
    let sub: any;
    if (gameState === 'playing' && !isPaused) {
      sub = Accelerometer.addListener(({ z }) => {
        if (z < -0.75 && statusRef.current === 'ready') { 
          setRoundHistory(prev => [...prev, { word: shuffledWords[wordIndex], result: 'correct' }]);
          setStatus('correct'); playSound('correct'); 
        }
        else if (z > 0.75 && statusRef.current === 'ready') { 
          setRoundHistory(prev => [...prev, { word: shuffledWords[wordIndex], result: 'pass' }]);
          setStatus('pass'); playSound('pass'); 
        }
        else if (z > -0.3 && z < 0.3 && statusRef.current !== 'ready') { 
          setStatus('ready'); setWordIndex(p => (p + 1) % shuffledWords.length); 
        }
      });
      Accelerometer.setUpdateInterval(100);
    }
    return () => sub && sub.remove();
  }, [gameState, isPaused, shuffledWords, wordIndex]);

  async function playSound(type: 'correct' | 'pass') {
    try {
      const source = type === 'correct' ? require('../assets/images/sounds/correct.mp3') : require('../assets/images/sounds/pass.mp3');
      const { sound } = await Audio.Sound.createAsync(source);
      await sound.playAsync();
    } catch (e) {}
  }

  const handleNextAction = () => {
    const correctCount = roundHistory.filter(h => h.result === 'correct').length;
    const currentScores = { ...initialTotalScores, [turn]: initialTotalScores[turn] + correctCount };

    if (!teamMode.isTeamMode) {
      onRoundComplete(currentScores, 1, true); // Tekli modda bitir
    } else {
      if (turn === 't1') {
        // T1 bitti, T2'ye geç (Aynı kategoriyle devam edebilir veya değişebilir ama T2'yi başlatıyoruz)
        setTurn('t2');
        setRoundHistory([]); setTimer(60); setCount(3); setWordIndex(0);
        setGameState('countdown');
      } else {
        // T2 de bitti, tur tamamlandı. Şimdi kategori seçimine dön!
        const isGameFinished = initialRound === teamMode.maxRounds;
        onRoundComplete(currentScores, initialRound + 1, isGameFinished);
      }
    }
  };

  if (gameState === 'roundSummary') {
    return (
      <View style={styles.resContainer}>
        <Text style={styles.resText}>TUR ÖZETİ - {turn === 't1' ? teamMode.team1 : teamMode.team2}</Text>
        <ScrollView style={{width: '80%', marginVertical: 10}}>
          {roundHistory.map((item, idx) => (
            <View key={idx} style={styles.historyRow}>
              <Text style={{color: 'white'}}>{item.word.toUpperCase()}</Text>
              <Text>{item.result === 'correct' ? '✅' : '❌'}</Text>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.btn} onPress={handleNextAction}><Text style={styles.btnText}>DEVAM</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient colors={status === 'correct' ? ['#2ecc71', '#27ae60'] : status === 'pass' ? ['#e74c3c', '#c0392b'] : ['#6c5ce7', '#a29bfe']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsPaused(true)} style={styles.pauseBtn}><Ionicons name="pause" size={28} color="white" /></TouchableOpacity>
        <Text style={styles.infoText}>{teamMode.isTeamMode ? (turn === 't1' ? teamMode.team1 : teamMode.team2) : ''} | Tur: {initialRound}</Text>
        <Text style={styles.timer}>{timer}</Text>
      </View>
      <View style={styles.wordBox}>
        <Text style={styles.wordText}>{gameState === 'countdown' ? count : (status === 'correct' ? 'DOĞRU' : status === 'pass' ? 'PAS' : shuffledWords[wordIndex]?.toUpperCase())}</Text>
      </View>
      <Modal visible={isPaused} transparent={true} animationType="fade">
        <View style={styles.overlay}><View style={styles.pauseCard}>
            <TouchableOpacity onPress={() => setIsPaused(false)} style={styles.btn}><Text style={styles.btnText}>DEVAM</Text></TouchableOpacity>
            <TouchableOpacity onPress={onQuit} style={[styles.btn, {marginTop: 10, backgroundColor: '#e74c3c'}]}><Text style={styles.btnText}>ÇIK</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { position: 'absolute', top: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pauseBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 15 },
  infoText: { color: 'white', fontWeight: 'bold' },
  timer: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  wordBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 40, borderRadius: 30, width: '70%', alignItems: 'center' },
  wordText: { fontSize: 50, color: 'white', fontWeight: 'bold', textAlign: 'center' },
  resContainer: { flex: 1, backgroundColor: '#1e272e', padding: 20, alignItems: 'center' },
  resText: { color: '#fdcb6e', fontSize: 24, fontWeight: 'bold' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderBottomWidth: 1, borderBottomColor: '#2f3542' },
  btn: { backgroundColor: '#6c5ce7', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25 },
  btnText: { color: 'white', fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  pauseCard: { backgroundColor: '#2d3436', padding: 40, borderRadius: 30, alignItems: 'center' }
});