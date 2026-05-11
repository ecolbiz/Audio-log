import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BASE_URL } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

export default function RecordScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [uploading, setUploading] = useState(false);

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
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
