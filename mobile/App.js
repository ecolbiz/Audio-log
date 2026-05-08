import React, { useEffect, useState } from 'react';
import { Button, FlatList, Text, TextInput, View } from 'react-native';

export default function App() {
  const [token, setToken] = useState('');
  const [audios, setAudios] = useState([]);

  const load = async () => {
    const res = await fetch('http://localhost:3000/api/audios/mine', { headers: { Authorization: `Bearer ${token}` } });
    setAudios(await res.json());
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text>Login token JWT</Text>
      <TextInput value={token} onChangeText={setToken} style={{ borderWidth: 1, padding: 8 }} />
      <Button title="Criar novo (integração gravador)" onPress={() => {}} />
      <FlatList
        data={audios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.extractedClient || 'Sem cliente'} - {item.status}</Text>}
      />
    </View>
  );
}
