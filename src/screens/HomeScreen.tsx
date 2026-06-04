import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { pickLocalBook } from '../services/FileService';
import { saveApiKey, getApiKey } from '../services/SecurityService';
import {
  insertOrUpdateBook,
  getAllBooks,
  type BookRow,
} from '../services/DatabaseService';
import { useTheme } from '../store/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

const formatProgress = (pct: number): string => `${(pct * 100).toFixed(0)}%`;

const formatDate = (ts: number): string => {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ---------------------------------------------------------------------------
// 主页
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const navigation = useNavigation<Nav>();

  // 状态
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);

  // 密钥模态
  const [modalVisible, setModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [keySaving, setKeySaving] = useState(false);

  // -----------------------------------------------------------------------
  // 生命周期：加载书架 & API Key
  // -----------------------------------------------------------------------

  const loadBooks = useCallback(async () => {
    try {
      setBooksLoading(true);
      const rows = await getAllBooks();
      setBooks(rows);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : '加载书架失败';
      Alert.alert('错误', msg);
    } finally {
      setBooksLoading(false);
    }
  }, []);

  // 每次页面获得焦点时刷新书架
  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [loadBooks])
  );

  // 加载已保存的 API Key
  useEffect(() => {
    (async () => {
      try {
        const key = await getApiKey();
        setSavedKey(key);
        if (key) setApiKeyInput(key);
      } catch {
        // 静默
      }
    })();
  }, []);

  // -----------------------------------------------------------------------
  // 导入书籍
  // -----------------------------------------------------------------------

  const handleImport = async () => {
    setLoading(true);
    try {
      const result = await pickLocalBook();
      if (result.canceled) return;

      const asset = result.assets[0];

      // 写入数据库
      await insertOrUpdateBook(asset.name, asset.uri);

      // 跳转阅读器
      navigation.navigate('Reader', {
        uri: asset.uri,
        fileName: asset.name,
      });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : '导入书籍时发生未知错误';
      Alert.alert('导入失败', msg);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // 密钥保存
  // -----------------------------------------------------------------------

  const handleSaveKey = async () => {
    setKeySaving(true);
    try {
      await saveApiKey(apiKeyInput.trim());
      setSavedKey(apiKeyInput.trim());
      setModalVisible(false);
      Alert.alert('成功', 'API Key 已安全存储至硬件加密沙盒');
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : '保存密钥失败';
      Alert.alert('保存失败', msg);
    } finally {
      setKeySaving(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      const key = await getApiKey();
      setApiKeyInput(key ?? '');
      setSavedKey(key);
    } catch {
      setApiKeyInput('');
    }
    setModalVisible(true);
  };

  // -----------------------------------------------------------------------
  // 动态样式
  // -----------------------------------------------------------------------

  const cs = {
    container: { backgroundColor: colors.background } as const,
    title: { color: colors.text } as const,
    subtitle: { color: colors.textSecondary } as const,
    button: { backgroundColor: colors.buttonBg, borderColor: colors.buttonBorder } as const,
    buttonText: { color: colors.buttonText } as const,
    hint: { color: colors.textMuted } as const,
    card: { backgroundColor: colors.surface, borderColor: colors.divider } as const,
    cardTitle: { color: colors.cardTitle } as const,
    label: { color: colors.textSecondary } as const,
    value: { color: colors.text } as const,
    valueSmall: { color: colors.textSecondary } as const,
    divider: { borderBottomColor: colors.divider } as const,
    iconBtn: { borderColor: colors.divider } as const,
    iconBtnText: { color: colors.text } as const,
    // 模态
    modalOverlay: { backgroundColor: 'rgba(0,0,0,0.55)' } as const,
    modalBg: { backgroundColor: colors.surface } as const,
    modalTitle: { color: colors.text } as const,
    modalDesc: { color: colors.textMuted } as const,
    input: {
      backgroundColor: colors.background,
      color: colors.text,
      borderColor: colors.divider,
    } as const,
    saveBtn: { backgroundColor: colors.buttonBg } as const,
    saveBtnText: { color: colors.buttonText } as const,
    // 书架列表
    bookItemBg: { backgroundColor: colors.surface, borderColor: colors.divider } as const,
    bookName: { color: colors.text } as const,
    bookMeta: { color: colors.textMuted } as const,
    bookProgress: { color: colors.textSecondary } as const,
    emptyText: { color: colors.textMuted } as const,
  };

  // -----------------------------------------------------------------------
  // 渲染
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView style={[styles.container, cs.container]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================= */}
        {/* 头部：设置 + 标题 + 主题切换                                     */}
        {/* ============================================================= */}
        <View style={styles.header}>
          {/* 设置按钮 */}
          <TouchableOpacity
            style={[styles.iconBtn, cs.iconBtn]}
            onPress={handleOpenSettings}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.iconBtnText, cs.iconBtnText]}>🔑</Text>
          </TouchableOpacity>

          {/* 标题 */}
          <View style={styles.headerCenter}>
            <Text style={[styles.appTitle, cs.title]}>深读</Text>
            <Text style={[styles.appSubtitle, cs.subtitle]}>Cogito</Text>
          </View>

          {/* 主题切换 */}
          <TouchableOpacity
            style={[styles.iconBtn, cs.iconBtn]}
            onPress={toggleTheme}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.iconBtnText, cs.iconBtnText]}>
              {mode === 'dark' ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================= */}
        {/* 导入按钮                                                       */}
        {/* ============================================================= */}
        <TouchableOpacity
          style={[styles.button, cs.button, loading && styles.buttonDisabled]}
          onPress={handleImport}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} size="small" />
          ) : (
            <Text style={[styles.buttonText, cs.buttonText]}>导入本地书籍</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.hint, cs.hint]}>支持 TXT / EPUB 格式</Text>

        {/* ============================================================= */}
        {/* 书架列表                                                       */}
        {/* ============================================================= */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, cs.cardTitle]}>我的书架</Text>

          {booksLoading ? (
            <ActivityIndicator
              color={colors.textSecondary}
              style={styles.loader}
            />
          ) : books.length === 0 ? (
            <Text style={[styles.emptyText, cs.emptyText]}>
              书架空空如也，导入你的第一本书吧
            </Text>
          ) : (
            books.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={[styles.bookItem, cs.bookItemBg]}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('Reader', {
                    uri: book.uri,
                    fileName: book.title,
                  })
                }
              >
                <View style={styles.bookInfo}>
                  <Text style={[styles.bookName, cs.bookName]} numberOfLines={1}>
                    {book.title}
                  </Text>
                  <Text style={[styles.bookMeta, cs.bookMeta]}>
                    {formatDate(book.last_read_time)}
                  </Text>
                </View>
                <Text style={[styles.bookProgress, cs.bookProgress]}>
                  {formatProgress(book.progress)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* =============================================================== */}
      {/* API Key 设置模态窗                                               */}
      {/* =============================================================== */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, cs.modalOverlay]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, cs.modalBg]}>
            <Text style={[styles.modalTitle, cs.modalTitle]}>API Key 配置</Text>
            <Text style={[styles.modalDesc, cs.modalDesc]}>
              你的密钥将存储在手机硬件级加密安全沙盒中，任何第三方应用均无法读取。
            </Text>

            {savedKey && !apiKeyInput && (
              <Text style={[styles.modalDesc, cs.modalDesc]}>
                已保存密钥：{savedKey.slice(0, 4)}****{savedKey.slice(-4)}
              </Text>
            )}

            <TextInput
              style={[styles.input, cs.input]}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="请输入 API Key"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                  取消
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, cs.saveBtn]}
                onPress={handleSaveKey}
                disabled={keySaving || !apiKeyInput.trim()}
                activeOpacity={0.7}
              >
                {keySaving ? (
                  <ActivityIndicator color={colors.buttonText} size="small" />
                ) : (
                  <Text style={[styles.saveBtnText, cs.saveBtnText]}>保存密钥</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// 静态样式（布局 / 尺寸 / 间距）
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  // 头部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 60,
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 8,
  },
  appSubtitle: {
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 18,
  },
  // 导入按钮
  button: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 240,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    marginTop: 12,
  },
  // 书架
  section: {
    width: '100%',
    marginTop: 36,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  loader: {
    marginTop: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  bookInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '600',
  },
  bookMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  bookProgress: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 模态
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    fontSize: 15,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});