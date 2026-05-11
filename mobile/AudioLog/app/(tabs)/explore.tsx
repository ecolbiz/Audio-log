import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BASE_URL, SERVER_URL } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type AudioItem = {
  id: string;
  filePath: string;
  status: 'PENDING' | 'TRANSCRIBED' | 'FAILED';
  createdAt: string;
  transcriptRaw?: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  TRANSCRIBED: { text: 'Transcrito', color: '#22C55E' },
  FAILED: { text: 'Falhou', color: '#EF4444' },
  PENDING: { text: 'Processando', color: '#F59E0B' },
};

export default function RecordingsScreen() {
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  async function fetchAudios(silent = false) {
    const token = await getToken();
    if (!token) { router.replace('/login'); return; }
    if (!silent) setLoading(true);
    const res = await fetch(`${BASE_URL}/audios/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { await clearToken(); router.replace('/login'); return; }
    const data = await res.json();
    setAudios(Array.isArray(data) ? data : []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchAudios(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAudios(true);
  }, []);

  async function togglePlay(item: AudioItem) {
    if (playingId === item.id) {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      setPlayingId(null);
      return;
    }
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    const url = `${SERVER_URL}/${item.filePath}`;
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    soundRef.current = sound;
    setPlayingId(item.id);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        setPlayingId(null);
        sound.unloadAsync();
        soundRef.current = null;
      }
    });
  }

  async function handleDelete(item: AudioItem) {
    Alert.alert(
      'Remover áudio',
      'Tem certeza que deseja remover esta gravação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/audios/${item.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) { await clearToken(); router.replace('/login'); return; }
            if (res.ok || res.status === 204) {
              setAudios((prev) => prev.filter((a) => a.id !== item.id));
            } else {
              Alert.alert('Erro', 'Não foi possível remover o áudio.');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minhas Gravações</Text>
      <FlatList
        data={audios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={audios.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma gravação ainda.{'\n'}Vá para a aba Gravar.</Text>
        }
        renderItem={({ item }) => {
          const st = STATUS_LABEL[item.status] ?? STATUS_LABEL.PENDING;
          const isPlaying = playingId === item.id;
          return (
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                onPress={() => togglePlay(item)}
              >
                <Text style={[styles.playIcon, isPlaying && styles.playIconActive]}>
                  {isPlaying ? '⏹' : '▶'}
                </Text>
              </TouchableOpacity>

              <View style={styles.info}>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                <Text style={[styles.status, { color: st.color }]}>{st.text}</Text>
              </View>

              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.deleteIcon}>🗑</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 15,
    lineHeight: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnActive: {
    backgroundColor: '#2563EB',
  },
  playIcon: {
    fontSize: 14,
    color: '#2563EB',
  },
  playIconActive: {
    color: '#fff',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 18,
  },
});
