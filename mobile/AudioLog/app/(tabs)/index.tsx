import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BASE_URL } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type Keyword = { name: string; type: string };
type KeywordSet = { id: string; name: string; keywords: Keyword[] };

export default function RecordScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cpcs, setCpcs] = useState<KeywordSet[]>([]);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch(`${BASE_URL}/keyword-sets/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setCpcs(await res.json());
      } catch {}
    })();
  }, []);

  async function handleLogout() {
    await clearToken();
    router.replace('/login');
  }

  async function startRecording() {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('Permissão negada', 'Habilite o microfone nas configurações do celular.');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(recording);
  }

  async function stopAndSave() {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (!uri) return;

    setUploading(true);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('audio', {
        uri,
        name: `audio_${Date.now()}.m4a`,
        type: 'audio/m4a',
      } as any);

      const res = await fetch(`${BASE_URL}/audios`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        await clearToken();
        router.replace('/login');
        return;
      }
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
      Alert.alert('Salvo!', 'Áudio enviado com sucesso.');
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível salvar o áudio.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Audio Log</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {recording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.dot} />
          <Text style={styles.recordingText}>Gravando...</Text>
        </View>
      )}

      {uploading ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.uploadingText}>Salvando áudio...</Text>
        </View>
      ) : recording ? (
        <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopAndSave}>
          <Text style={styles.buttonText}>Parar e Salvar</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.button, styles.startButton]} onPress={startRecording}>
          <Text style={styles.buttonText}>Iniciar Gravação</Text>
        </TouchableOpacity>
      )}

      {cpcs.length > 0 && (
        <View style={styles.cpcSection}>
          <Text style={styles.cpcSectionTitle}>Conjuntos de palavras-chave</Text>
          {cpcs.map((cpc) => (
            <View key={cpc.id} style={styles.cpcCard}>
              <Text style={styles.cpcName}>{cpc.name}</Text>
              <View style={styles.keywordList}>
                {(cpc.keywords || []).map((kw, i) => (
                  <View key={i} style={styles.keywordRow}>
                    <Text style={styles.keywordName}>{kw.name}</Text>
                    <Text style={styles.keywordType}>{kw.type}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 32,
    paddingTop: 60,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logoutText: {
    fontSize: 14,
    color: '#666',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  recordingText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  button: {
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 50,
    minWidth: 220,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#22C55E',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  uploadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    fontSize: 16,
    color: '#666',
  },
  cpcSection: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  cpcSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cpcCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  cpcName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  keywordList: {
    gap: 4,
  },
  keywordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keywordName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  keywordType: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
