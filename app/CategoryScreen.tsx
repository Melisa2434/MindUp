import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Category } from './(tabs)/index';
import wordData from './words.json';

interface Props { 
  lang: 'tr' | 'en'; 
  onSelectCategory: (category: Category) => void;
  headerComponent?: React.ReactElement; 
}

export default function CategoryScreen({ lang, onSelectCategory, headerComponent }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWords, setNewWords] = useState('');

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    const saved = await AsyncStorage.getItem('custom_categories');
    const customCats = saved ? JSON.parse(saved) : [];
    const staticCats = (wordData as any).categories as Category[];
    setCategories([...staticCats, ...customCats]);
  };

  const handleAddCategory = async () => {
    if (!newTitle || !newWords) return;
    const newCat: Category = {
      id: Date.now().toString(),
      title: { tr: newTitle, en: newTitle },
      color: '#8e44ad',
      words: { tr: newWords.split(',').map(w => w.trim()), en: newWords.split(',').map(w => w.trim()) }
    };
    const saved = await AsyncStorage.getItem('custom_categories');
    const updated = [...(saved ? JSON.parse(saved) : []), newCat];
    await AsyncStorage.setItem('custom_categories', JSON.stringify(updated));
    setModalVisible(false); setNewTitle(''); setNewWords('');
    loadCategories();
  };

  const t = { 
    tr: { cat: 'Kategoriler', add: 'Kategori Ekle', save: 'Kaydet', ph: 'Ad', wp: 'Kelimeler (virgül ile)' }, 
    en: { cat: 'Categories', add: 'Add Category', save: 'Save', ph: 'Name', wp: 'Words (with comma)' } 
  }[lang];

  return (
    <View style={{flex: 1}}>
      <FlatList
        data={categories}
        numColumns={2}
        keyExtractor={(item) => item.id}
        
        ListHeaderComponent={
          <View>
            {headerComponent}
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingRight: 20}}>
              <Text style={styles.headerTitle}>{t.cat}</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addMiniBtn}>
                <Text style={{color:'white', fontWeight:'bold', fontSize: 12}}>{t.add}</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.cardWrapper} onPress={() => onSelectCategory(item)}>
            <LinearGradient colors={[item.color, '#2d3436']} style={styles.card}>
              <Text style={styles.cardText}>{item.title[lang].toUpperCase()}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <TextInput style={styles.input} placeholder={t.ph} value={newTitle} onChangeText={setNewTitle} />
            <TextInput style={[styles.input, {height: 80}]} placeholder={t.wp} multiline value={newWords} onChangeText={setNewWords} />
            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtn}><Text>X</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddCategory} style={[styles.modalBtn, {backgroundColor:'#6c5ce7'}]}><Text style={{color:'white'}}>{t.save}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitle: { fontSize: 24, fontWeight: 'bold', padding: 20, color: 'white', textShadowColor: 'black', textShadowRadius: 3 },
  addMiniBtn: { backgroundColor: '#6c5ce7', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#a29bfe' },
  cardWrapper: { flex: 1, margin: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  card: { height: 100, borderRadius: 15, justifyContent: 'center', alignItems: 'center', padding: 10 },
  cardText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#2f3542', width: '85%', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#57606f' },
  input: { backgroundColor: 'white', borderRadius: 10, padding: 12, marginBottom: 15 },
  modalBtn: { padding: 12, borderRadius: 10, backgroundColor: '#dcdde1', minWidth: 80, alignItems: 'center' }
});