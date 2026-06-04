import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { pickLocalBook, type FileMeta } from '../services/FileService';
import { useTheme } from '../store/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function HomeScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const navigation = useNavigation<Nav>();

  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    try {
      const result = await pickLocalBook();
      if (result.canceled) return;

      const asset = result.assets[0];
      setFileMeta(asset);

      // 选中后立即跳转阅读器
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

  // 动态样式
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    title: { color: colors.text },
    subtitle: { color: colors.textSecondary },
    button: { backgroundColor: colors.buttonBg, borderColor: colors.buttonBorder },
    buttonText: { color: colors.buttonText },
    hint: { color: colors.textMuted },
    card: { backgroundColor: colors.surface, borderColor: colors.divider },
    cardTitle: { color: colors.cardTitle },
    label: { color: colors.textSecondary },
    value: { color: colors.text },
    valueSmall: { color: colors.textSecondary },
    divider: { borderBottomColor: colors.divider },
    themeBtn: { borderColor: colors.divider },
    themeBtnText: { color: colors.text },
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {/* 头部 + 主题切换按钮 */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <Text style={[styles.appTitle, dynamicStyles.title]}>深读</Text>
          <Text style={[styles.appSubtitle, dynamicStyles.subtitle]}>Cogito</Text>
        </View>
        <TouchableOpacity
          style={[styles.themeBtn, dynamicStyles.themeBtn]}
          onPress={toggleTheme}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.themeBtnText, dynamicStyles.themeBtnText]}>
            {mode === 'dark' ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 导入按钮 */}
      <TouchableOpacity
        style={[styles.button, dynamicStyles.button, loading && styles.buttonDisabled]}
        onPress={handleImport}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color={colors.buttonText} size="small" />
        ) : (
          <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
            导入本地书籍
          </Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.hint, dynamicStyles.hint]}>支持 TXT / EPUB 格式</Text>

      {/* 文件信息面板 */}
      {fileMeta && (
        <View style={[styles.card, dynamicStyles.card]}>
          <Text style={[styles.cardTitle, dynamicStyles.cardTitle]}>
            已选书籍信息
          </Text>

          <InfoRow
            label="文件名"
            value={fileMeta.name}
            labelStyle={dynamicStyles.label}
            valueStyle={dynamicStyles.value}
            dividerStyle={dynamicStyles.divider}
          />
          <InfoRow
            label="文件大小"
            value={formatFileSize(fileMeta.size)}
            labelStyle={dynamicStyles.label}
            valueStyle={dynamicStyles.value}
            dividerStyle={dynamicStyles.divider}
          />
          <InfoRow
            label="URI 路径"
            value={fileMeta.uri}
            small
            labelStyle={dynamicStyles.label}
            valueStyle={dynamicStyles.valueSmall}
            dividerStyle={dynamicStyles.divider}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  value,
  small = false,
  labelStyle,
  valueStyle,
  dividerStyle,
}: {
  label: string;
  value: string;
  small?: boolean;
  labelStyle: object;
  valueStyle: object;
  dividerStyle: object;
}) {
  return (
    <View style={[styles.infoRow, dividerStyle]}>
      <Text style={[styles.infoLabel, labelStyle]}>{label}</Text>
      <Text
        style={[
          small ? styles.infoValueSmall : styles.infoValue,
          valueStyle,
        ]}
        numberOfLines={small ? 2 : 1}
      >
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 静态样式（布局相关）
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 60,
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  headerLeft: {
    width: 40,
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
  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBtnText: {
    fontSize: 18,
  },
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
  card: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    marginTop: 36,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  infoValueSmall: {
    fontSize: 12,
    flex: 2,
    textAlign: 'right',
  },
});