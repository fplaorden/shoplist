import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Modal, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function ListsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchLists = useCallback(async () => {
    try {
      const data = await api.getLists();
      setLists(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  async function createList() {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      await api.createList(newListName.trim());
      setNewListName('');
      setShowCreate(false);
      fetchLists();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  }

  async function deleteList(id, name) {
    Alert.alert(
      'Eliminar lista',
      `¿Seguro que quieres eliminar "${name}"? Se borrarán todos los items.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteList(id);
              setLists(prev => prev.filter(l => l.id !== id));
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  }

  function renderList({ item }) {
    const isOwner = item.owner_id === user.id;
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => navigation.navigate('ShoppingList', { list: item })}
        onLongPress={() => isOwner && deleteList(item.id, item.name)}
      >
        <View style={styles.listCardLeft}>
          <Text style={styles.listIcon}>🛒</Text>
          <View>
            <Text style={styles.listName}>{item.name}</Text>
            <Text style={styles.listMeta}>
              {item.member_count} miembro{item.member_count !== '1' ? 's' : ''} ·{' '}
              <Text style={styles.pendingBadge}>{item.pending_count} pendiente{item.pending_count !== '1' ? 's' : ''}</Text>
            </Text>
          </View>
        </View>
        <View style={styles.listCardRight}>
          {isOwner && <Text style={styles.ownerBadge}>👑</Text>}
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, <Text style={styles.alias}>@{user.alias}</Text></Text>
          <Text style={styles.headerSub}>Tus listas de la compra</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#6c63ff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={item => item.id}
          renderItem={renderList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLists(); }} tintColor="#6c63ff" />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No tienes listas todavía</Text>
              <Text style={styles.emptyHint}>Crea una o acepta una invitación</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nueva lista</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre de la lista"
              placeholderTextColor="#666"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setShowCreate(false); setNewListName(''); }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={createList} disabled={creating}>
                {creating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmText}>Crear</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#1a1a2e'
  },
  greeting: { fontSize: 20, color: '#ccc', fontWeight: '500' },
  alias: { color: '#6c63ff', fontWeight: '800' },
  headerSub: { fontSize: 13, color: '#555', marginTop: 2 },
  logoutBtn: { padding: 8 },
  logoutText: { color: '#ff6b6b', fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 100 },
  listCard: {
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16,
    marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4a'
  },
  listCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listIcon: { fontSize: 28 },
  listName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  listMeta: { fontSize: 12, color: '#666' },
  pendingBadge: { color: '#6c63ff' },
  listCardRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ownerBadge: { fontSize: 14 },
  chevron: { fontSize: 24, color: '#444' },
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#6c63ff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8
  },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#aaa', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#555', marginTop: 6 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24
  },
  modal: {
    backgroundColor: '#1a1a2e', borderRadius: 20,
    padding: 24, width: '100%', borderWidth: 1, borderColor: '#2a2a4a'
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#0f0f1a', borderRadius: 12, padding: 14,
    color: '#fff', borderWidth: 1, borderColor: '#2a2a4a', fontSize: 15, marginBottom: 16
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#0f0f1a', borderWidth: 1, borderColor: '#2a2a4a' },
  confirmBtn: { backgroundColor: '#6c63ff' },
  cancelText: { color: '#888', fontWeight: '600' },
  confirmText: { color: '#fff', fontWeight: '700' },
});
