import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useTheme } from '../store/ThemeContext';

/**
 * 路由参数类型（与 App.tsx 中的 RootStackParamList 保持一致）
 */
export interface ReaderScreenParams {
  uri: string;
  fileName: string;
}

export default function ReaderScreen({
  route,
}: {
  route: { params: ReaderScreenParams };
}) {
  const { uri, fileName } = route.params;
  const { colors } = useTheme();

  const html = useMemo(
    () => buildReaderHTML(fileName, colors.background, colors.text),
    [fileName, colors.background, colors.text]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        containerStyle={styles.webviewContainer}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// HTML 模板构建
// ---------------------------------------------------------------------------

function buildReaderHTML(
  fileName: string,
  bgColor: string,
  textColor: string
): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      background-color: ${bgColor};
      color: ${textColor};
      font-family: -apple-system, "PingFang SC", "Noto Serif SC", "Source Han Serif SC", Georgia, serif;
      font-size: 17px;
      line-height: 1.8;
      -webkit-font-smoothing: antialiased;
    }
    .reader-container {
      max-width: 720px;
      margin: 0 auto;
      padding: 24px 20px 48px;
    }
    .reader-header {
      text-align: center;
      padding-bottom: 24px;
      margin-bottom: 24px;
      border-bottom: 1px solid ${textColor}1A;
    }
    .reader-header h1 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .reader-body {
      color: ${textColor};
    }
    .reader-body p {
      margin-bottom: 16px;
      text-indent: 2em;
    }
    .placeholder {
      text-align: center;
      padding: 80px 0;
      opacity: 0.5;
    }
    .placeholder p {
      text-indent: 0;
    }
  </style>
</head>
<body>
  <div class="reader-container">
    <div class="reader-header">
      <h1>${escapeHTML(fileName)}</h1>
    </div>
    <div class="reader-body">
      <div class="placeholder">
        <p>书籍内容加载区域</p>
        <p>—— 深读 · Cogito ——</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// 样式
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webviewContainer: {
    flex: 1,
  },
});