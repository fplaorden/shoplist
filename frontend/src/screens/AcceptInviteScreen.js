import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert
} from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AcceptInviteScreen({ route, navigation }) {
  const { token } = route.params;
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getInviteInfo(token)
      .then(setInfo)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function accept() {
    setAccepting(true);
    try {
      const data = await api.acceptInvite(token);
      Alert.alert('¡Unido!', `Te has unido a "${data.list.name}"`, [
        { text: 'Ver lista', onPress: () => navigation.replace('ShoppingList', { list: data.list }) }
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAccepting(false);
    }
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#6c63ff" size="large" />
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>❌</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🛒</Text>
        <Text style={styles.title}>Invitación recibida</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.accent}>@{info.invited_by_alias}</Text> te invita a unirte a:
        </Text>
        <Text style={styles.listName}>"{info.list_name}"</Text>
        <Text style={styles.userInfo}>Entrarás como <Text style={styles.accent}>@{user?.alias}</Text></Text>

        <TouchableOpacity style={styles.acceptBtn} onPress={accept} disabled={accepting}>
          {accepting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.acceptBtnText}>✓ Aceptar invitación</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.rejectBtnText}>Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', padding: 24 },
  center: { flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: '#1a1a2e', borderRadius: 24, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4a'
  },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 8 },
  accent: { color: '#6c63ff', fontWeight: '700' },
  listName: { fontSize: 20, fontWeight: '700', color: '#fff', marginVertical: 12, textAlign: 'center' },
  userInfo: { fontSize: 13, color: '#666', marginBottom: 24 },
  acceptBtn: {
    backgroundColor: '#6c63ff', borderRadius: 14, padding: 16,
    width: '100%', alignItems: 'center', marginBottom: 10
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rejectBtn: {
    padding: 12, width: '100%', alignItems: 'center'
  },
  rejectBtnText: { color: '#555', fontWeight: '600' },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { color: '#ff6b6b', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: '#6c63ff', borderRadius: 12, padding: 14 },
  btnText: { color: '#fff', fontWeight: '700' },
});
