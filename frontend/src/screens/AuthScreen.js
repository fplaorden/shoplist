import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), alias.trim(), password);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.logo}>🛒</Text>
          <Text style={styles.title}>ShopList</Text>
          <Text style={styles.subtitle}>Tu lista de la compra compartida</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.activeTab]}
              onPress={() => { setMode('login'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>
                Entrar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.activeTab]}
              onPress={() => { setMode('register'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>
                Registrarse
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Alias (ej: maria_garcia)"
              placeholderTextColor="#666"
              value={alias}
              onChangeText={setAlias}
              autoCapitalize="none"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>
                  {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
                </Text>
            }
          </TouchableOpacity>

          {mode === 'register' && (
            <Text style={styles.hint}>
              El alias es tu nombre visible para los demás. Solo letras, números y guiones bajos.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4 },
  card: {
    backgroundColor: '#1a1a2e', borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: '#2a2a4a'
  },
  tabs: {
    flexDirection: 'row', backgroundColor: '#0f0f1a',
    borderRadius: 12, padding: 4, marginBottom: 20
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center'
  },
  activeTab: { backgroundColor: '#6c63ff' },
  tabText: { color: '#666', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  input: {
    backgroundColor: '#0f0f1a', borderRadius: 12,
    padding: 14, color: '#fff', marginBottom: 12,
    borderWidth: 1, borderColor: '#2a2a4a', fontSize: 15
  },
  button: {
    backgroundColor: '#6c63ff', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 4
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#ff6b6b', marginBottom: 12, textAlign: 'center', fontSize: 13 },
  hint: { color: '#555', fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 }
});
