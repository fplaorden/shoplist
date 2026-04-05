import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Modal, ActivityIndicator, Alert, Share,
  KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';

const CATEGORIES = ['🥩 Carne', '🥦 Verdura', '🍎 Fruta', '🥛 Lácteos', '🥖 Panadería', '🧴 Higiene', '🧹 Limpieza', '🥫 Conservas', '❄️ Congelados', '🍷 Bebidas', '🍬 Dulces', '📦 Otros'];

export default function ShoppingListScreen({ route, navigation }) {
  const { list } = route.params;
  const { user } = useAuth();
  const socket = useSocket();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [members, setMembers] = useState([]);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);

  const fetchItems = useCallback(async () => {
    try {
      const data = await api.getItems(list.id);
      setItems(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [list.id]);

  useEffect(() => {
    fetchItems();

    // Socket room
    if (socket) {
      socket.emit('join_list', list.id);
      socket.on('item_added', (item) => {
        setItems(prev => {
          if (prev.find(i => i.id === item.id)) return prev;
          return [item, ...prev];
        });
      });
      socket.on('item_updated', (updated) => {
        setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
      });
      socket.on('item_deleted', ({ id }) => {
        setItems(prev => prev.filter(i => i.id !== id));
      });
      socket.on('checked_cleared', () => {
        setItems(prev => prev.filter(i => !i.checked));
      });
      socket.on('member_joined', ({ alias }) => {
        Alert.alert('Nuevo miembro', `@${alias} se ha unido a la lista`);
      });
      return () => {
        socket.emit('leave_list', list.id);
        socket.off('item_added');
        socket.off('item_updated');
        socket.off('item_deleted');
        socket.off('checked_cleared');
        socket.off('member_joined');
      };
    }
  }, [socket, list.id, fetchItems]);

  async function addItem() {
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      await api.addItem({
        list_id: list.id,
        name: newItem.trim(),
        quantity: newQty.trim() || null,
        category: selectedCategory || null,
      });
      setNewItem('');
      setNewQty('');
      setSelectedCategory('');
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAdding(false);
    }
  }

  async function toggleItem(id) {
    try {
      await api.toggleItem(id);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function deleteItem(id) {
    try {
      await api.deleteItem(id);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function clearChecked() {
    Alert.alert('Limpiar marcados', '¿Eliminar todos los items marcados?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpiar', style: 'destructive',
        onPress: () => api.clearChecked(list.id).catch(e => Alert.alert('Error', e.message))
      }
    ]);
  }

  async function openInvite() {
    setShowInvite(true);
    if (!inviteLink) {
      setInviteLoading(true);
      try {
        const data = await api.createInvite(list.id);
        const link = `shoplist://invite/${data.invite_token}`;
        setInviteLink(link);
      } catch (e) {
        Alert.alert('Error', e.message);
        setShowInvite(false);
      } finally {
        setInviteLoading(false);
      }
    }
  }

  async function shareInvite() {
    try {
      await Share.share({ message: `¡Te invito a unirte a mi lista de la compra "${list.name}"! Abre este enlace: ${inviteLink}` });
    } catch {}
  }

  async function openMembers() {
    setShowMembers(true);
    try {
      const data = await api.getMembers(list.id);
      setMembers(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  const pending = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);
  const isOwner = list.owner_id === user.id;

  function renderItem({ item }) {
    return (
      <View style={[styles.item, item.checked && styles.itemChecked]}>
        <TouchableOpacity onPress={() => toggleItem(item.id)} style={styles.checkbox}>
          <Text style={styles.checkboxIcon}>{item.checked ? '✅' : '⬜'}</Text>
        </TouchableOpacity>
        <View style={styles.itemContent}>
          <View style={styles.itemTop}>
            <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
              {item.name}
            </Text>
            {item.quantity && (
              <Text style={styles.itemQty}>{item.quantity}</Text>
            )}
          </View>
          <View style={styles.itemBottom}>
            {item.category && (
              <Text style={styles.categoryTag}>{item.category}</Text>
            )}
            <View style={styles.aliasTag}>
              <Text style={styles.aliasText}>@{item.added_by_alias}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{list.name}</Text>
          <Text style={styles.headerSub}>{pending.length} pendientes</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={openMembers} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>👥</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity onPress={openInvite} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>🔗</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#6c63ff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[...pending, ...checked]}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            checked.length > 0 && pending.length > 0 ? (
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <TouchableOpacity onPress={clearChecked}>
                  <Text style={styles.dividerText}>Marcados · Limpiar</Text>
                </TouchableOpacity>
                <View style={styles.dividerLine} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyText}>La lista está vacía</Text>
              <Text style={styles.emptyHint}>Añade el primer producto</Text>
            </View>
          }
        />
      )}

      {/* Add Item Bar */}
      <View style={styles.addBar}>
        <TouchableOpacity
          style={styles.categoryBtn}
          onPress={() => setShowCategoryPicker(true)}
        >
          <Text style={styles.categoryBtnText}>
            {selectedCategory ? selectedCategory.split(' ')[0] : '📦'}
          </Text>
        </TouchableOpacity>
        <View style={styles.addInputs}>
          <TextInput
            ref={inputRef}
            style={styles.addInput}
            placeholder="Añadir producto..."
            placeholderTextColor="#555"
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <TextInput
            style={[styles.addInput, styles.qtyInput]}
            placeholder="Cant."
            placeholderTextColor="#555"
            value={newQty}
            onChangeText={setNewQty}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={addItem} disabled={adding}>
          {adding
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.addBtnText}>+</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCategoryPicker(false)}>
          <View style={styles.categoryModal}>
            <Text style={styles.modalTitle}>Categoría</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catItem, selectedCategory === cat && styles.catItemActive]}
                  onPress={() => { setSelectedCategory(cat === selectedCategory ? '' : cat); setShowCategoryPicker(false); }}
                >
                  <Text style={styles.catText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Members Modal */}
      <Modal visible={showMembers} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Miembros</Text>
            {members.map(m => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>{m.alias[0].toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.memberAlias}>@{m.alias}</Text>
                  <Text style={styles.memberEmail}>{m.email}</Text>
                </View>
                {m.role === 'owner' && <Text style={styles.ownerIcon}>👑</Text>}
              </View>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowMembers(false)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal visible={showInvite} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Invitar a la lista</Text>
            {inviteLoading ? (
              <ActivityIndicator color="#6c63ff" style={{ marginVertical: 20 }} />
            ) : (
              <>
                <Text style={styles.inviteHint}>Comparte este enlace con quien quieras invitar. Válido 7 días.</Text>
                <View style={styles.inviteLinkBox}>
                  <Text style={styles.inviteLinkText} numberOfLines={2}>{inviteLink}</Text>
                </View>
                <TouchableOpacity style={styles.shareBtn} onPress={shareInvite}>
                  <Text style={styles.shareBtnText}>📤 Compartir enlace</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowInvite(false)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1a1a2e'
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 32, color: '#6c63ff', lineHeight: 36 },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#6c63ff', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { padding: 8 },
  headerBtnText: { fontSize: 20 },
  listContent: { padding: 16, paddingBottom: 100 },
  item: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a4a', gap: 10
  },
  itemChecked: { opacity: 0.5, borderColor: '#1a1a2e' },
  checkbox: { padding: 4 },
  checkboxIcon: { fontSize: 22 },
  itemContent: { flex: 1 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#fff', flex: 1 },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#555' },
  itemQty: {
    fontSize: 12, color: '#6c63ff', fontWeight: '700',
    backgroundColor: '#1a1040', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8
  },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  categoryTag: {
    fontSize: 11, color: '#aaa',
    backgroundColor: '#242436', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6
  },
  aliasTag: {
    backgroundColor: '#2a1a4a', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6
  },
  aliasText: { fontSize: 11, color: '#a585ff', fontWeight: '600' },
  deleteBtn: { padding: 6 },
  deleteIcon: { fontSize: 14, color: '#444' },
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2a2a4a' },
  dividerText: { color: '#ff6b6b', fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#aaa', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#555', marginTop: 6 },
  addBar: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderTopWidth: 1, borderTopColor: '#1a1a2e',
    backgroundColor: '#0f0f1a', gap: 8
  },
  categoryBtn: {
    width: 44, height: 44, backgroundColor: '#1a1a2e',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2a2a4a'
  },
  categoryBtnText: { fontSize: 20 },
  addInputs: { flex: 1, flexDirection: 'row', gap: 6 },
  addInput: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 10, color: '#fff', borderWidth: 1, borderColor: '#2a2a4a', fontSize: 14
  },
  qtyInput: { flex: 0, width: 64 },
  addBtn: {
    width: 44, height: 44, backgroundColor: '#6c63ff',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center'
  },
  addBtnText: { fontSize: 24, color: '#fff', lineHeight: 28 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24
  },
  modal: {
    backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24,
    width: '100%', borderWidth: 1, borderColor: '#2a2a4a'
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 16 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a'
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6c63ff', alignItems: 'center', justifyContent: 'center'
  },
  memberInitial: { color: '#fff', fontWeight: '700', fontSize: 16 },
  memberAlias: { color: '#fff', fontWeight: '600', fontSize: 14 },
  memberEmail: { color: '#555', fontSize: 12 },
  ownerIcon: { marginLeft: 'auto', fontSize: 16 },
  closeBtn: {
    marginTop: 16, backgroundColor: '#0f0f1a', borderRadius: 12,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4a'
  },
  closeBtnText: { color: '#888', fontWeight: '600' },
  inviteHint: { color: '#888', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  inviteLinkBox: {
    backgroundColor: '#0f0f1a', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2a2a4a', marginBottom: 12
  },
  inviteLinkText: { color: '#a585ff', fontSize: 12, fontFamily: 'monospace' },
  shareBtn: {
    backgroundColor: '#6c63ff', borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 4
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  categoryModal: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catItem: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#0f0f1a', borderRadius: 10,
    borderWidth: 1, borderColor: '#2a2a4a'
  },
  catItemActive: { backgroundColor: '#2a1a4a', borderColor: '#6c63ff' },
  catText: { color: '#ccc', fontSize: 13 },
});
