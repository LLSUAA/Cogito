import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

import { useTheme, type ThemeColors } from '../store/ThemeContext';
import { analyzeChapter, parseContentJSON } from '../services/AiService';
import type { TaskType } from '../services/AiService';

// ---------------------------------------------------------------------------
// 路由参数
// ---------------------------------------------------------------------------

export interface ReaderScreenParams {
  uri: string;
  fileName: string;
}

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

interface ConceptItem {
  concept: string;
  definition: string;
  relations: string[];
  evidence: string[];
}

interface SummaryData {
  core_thesis: string;
  concept_map: ConceptItem[];
  logic_chain: string;
}

interface QuizOption {
  label: string;
  text: string;
}

interface QuizQuestion {
  id: number;
  type: string;
  stem: string;
  options: QuizOption[];
  answer: string;
  analysis: string;
}

interface QuizData {
  questions: QuizQuestion[];
}

type PanelState = 'idle' | 'loading' | 'summary' | 'quiz';

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function isTxtFile(fileName: string): boolean {
  return /\.txt$/i.test(fileName);
}

function isEpubFile(fileName: string): boolean {
  return /\.epub$/i.test(fileName);
}

// ---------------------------------------------------------------------------
// epub.js HTML 模板（主题色通过占位符动态注入）
// ---------------------------------------------------------------------------

function buildEpubHTML(bgColor: string, textColor: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background-color: ${bgColor};
      color: ${textColor};
      overflow: hidden;
      font-family: -apple-system, "PingFang SC", "Noto Serif SC", Georgia, serif;
    }
    #viewer {
      width: 100%; height: calc(100% - 44px);
      overflow: hidden;
    }
    #viewer iframe {
      background-color: ${bgColor} !important;
    }
    /* 导航栏 */
    #nav-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 44px;
      padding: 0 16px;
      background-color: ${bgColor};
      border-top: 1px solid ${textColor}22;
    }
    #nav-bar button {
      background: ${bgColor};
      color: ${textColor};
      border: 1px solid ${textColor}44;
      border-radius: 8px;
      padding: 6px 16px;
      font-size: 14px;
      cursor: pointer;
    }
    #nav-bar button:active { opacity: 0.6; }
    #page-info {
      font-size: 12px;
      color: ${textColor};
      opacity: 0.7;
    }
    /* 加载遮罩 */
    #loading-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: ${bgColor};
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      z-index: 999;
    }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid ${textColor}33;
      border-top-color: ${textColor};
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #loading-overlay p {
      margin-top: 16px;
      color: ${textColor};
      opacity: 0.6;
      font-size: 14px;
    }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div id="loading-overlay">
    <div class="spinner"></div>
    <p>正在加载 EPUB 书籍...</p>
  </div>

  <div id="viewer"></div>

  <div id="nav-bar">
    <button id="btn-prev" onclick="goPrev()">◀ 上一页</button>
    <span id="page-info"></span>
    <button id="btn-next" onclick="goNext()">下一页 ▶</button>
  </div>

  <script>
    // ── 全局状态 ──
    let book = null;
    let rendition = null;
    let currentBase64 = '';

    // ── base64 → ArrayBuffer ──
    function base64ToArrayBuffer(b64) {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    // ── 提取当前章节纯文本 ──
    function extractCurrentSectionText() {
      if (!book || !rendition) return;
      try {
        const loc = rendition.currentLocation();
        if (!loc || !loc.start) return;
        const section = book.spine.get(loc.start.index);
        if (!section) return;
        book.load(section.href).then(function(doc) {
          const text = (doc.body && doc.body.innerText) || '';
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'text',
            data: text.trim()
          }));
        }).catch(function() {});
      } catch(e) {}
    }

    // ── 更新页面信息 ──
    function updatePageInfo() {
      if (!rendition) return;
      try {
        const loc = rendition.currentLocation();
        if (!loc || !loc.start) return;
        const pct = loc.start.percentage;
        const total = book.spine ? book.spine.items.length : 0;
        const current = loc.start.index + 1;
        document.getElementById('page-info').textContent =
          (pct ? (pct * 100).toFixed(0) + '%' : '') +
          '  |  章节 ' + current + '/' + total;
      } catch(e) {}
    }

    // ── 导航 ──
    function goPrev() {
      if (rendition) rendition.prev();
    }
    function goNext() {
      if (rendition) rendition.next();
    }

    // ── 加载 EPUB ──
    function loadEpub(base64) {
      currentBase64 = base64;
      try {
        const arrayBuffer = base64ToArrayBuffer(base64);
        book = ePub(arrayBuffer);

        rendition = book.renderTo('viewer', {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
          allowScriptedContent: true,
        });

        // 渲染完成后隐藏 loading
        rendition.display().then(function() {
          document.getElementById('loading-overlay').classList.add('hidden');
          updatePageInfo();
          extractCurrentSectionText();
        });

        // 每次翻页时触发
        rendition.on('relocated', function(loc) {
          updatePageInfo();
          extractCurrentSectionText();
        });

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'bookLoaded'
        }));
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          data: 'EPUB 加载失败: ' + e.message
        }));
      }
    }

    // ── 主题更新 ──
    function updateTheme(bg, txt) {
      document.body.style.backgroundColor = bg;
      document.body.style.color = txt;
      document.getElementById('viewer').style.backgroundColor = bg;
      document.getElementById('loading-overlay').style.backgroundColor = bg;
      document.getElementById('nav-bar').style.backgroundColor = bg;
      document.getElementById('nav-bar').style.borderTopColor = txt + '22';
      var btns = document.querySelectorAll('#nav-bar button');
      for (var i = 0; i < btns.length; i++) {
        btns[i].style.backgroundColor = bg;
        btns[i].style.color = txt;
        btns[i].style.borderColor = txt + '44';
      }
      document.getElementById('page-info').style.color = txt;
      if (rendition && rendition.themes) {
        rendition.themes.register('cogito-theme', {
          body: { background: bg, color: txt },
          'a': { color: txt }
        });
        rendition.themes.select('cogito-theme');
      }
    }

    // ── 监听来自 React Native 的消息 ──
    window.addEventListener('message', function(event) {
      try {
        var msg = JSON.parse(event.data);
        switch(msg.type) {
          case 'setBase64':
            loadEpub(msg.data);
            break;
          case 'setTheme':
            updateTheme(msg.bg, msg.txt);
            break;
          case 'prev':
            goPrev();
            break;
          case 'next':
            goNext();
            break;
        }
      } catch(e) {}
    });

    // ── 通知 RN 页面已就绪 ──
    // epub.js 脚本可能还在加载中，稍后由 bookLoaded 事件通知
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    }
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export default function ReaderScreen({
  route,
  navigation,
}: {
  route: { params: ReaderScreenParams };
  navigation: { goBack: () => void };
}) {
  const { uri, fileName } = route.params;
  const { colors } = useTheme();

  const webViewRef = useRef<WebView>(null);

  // ── EPUB 数据 ──
  const [epubBase64, setEpubBase64] = useState<string | null>(null);
  const [epubLoading, setEpubLoading] = useState(true);
  const [epubReady, setEpubReady] = useState(false);

  // ── 当前章节文本（真实提取） ──
  const [currentChapterText, setCurrentChapterText] = useState('');

  // ── 面板状态 ──
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [panelTitle, setPanelTitle] = useState('');

  // ── 摘要数据 ──
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [expandedConcepts, setExpandedConcepts] = useState<Set<number>>(new Set());

  // ── 自测数据 ──
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // ── 读取 EPUB 文件（uri 已由 DocumentPicker copyToCacheDirectory 保证为 file:// 路径） ──
  useEffect(() => {
    if (!isEpubFile(fileName)) return;

    let cancelled = false;
    (async () => {
      try {
        setEpubLoading(true);

        const b64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (!cancelled) {
          setEpubBase64(b64);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '未知错误';
        console.error('[ReaderScreen] EPUB 读取失败:', message);
        if (!cancelled) {
          Alert.alert('加载失败', `无法读取 EPUB 文件: ${message}`);
          setEpubLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri, fileName]);

  // ── 当 epubBase64 就绪后注入 WebView ──
  const handleWebViewLoad = useCallback(() => {
    if (epubBase64 && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: 'setBase64', data: epubBase64 })
      );
    }
  }, [epubBase64]);

  // ── 主题变化时注入 WebView ──
  useEffect(() => {
    if (epubReady && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'setTheme',
          bg: colors.background,
          txt: colors.text,
        })
      );
    }
  }, [colors.background, colors.text, epubReady]);

  // ── 处理来自 WebView 的消息 ──
  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        switch (msg.type) {
          case 'ready':
            // epub.js 脚本已加载，可以发送 base64 数据
            break;
          case 'bookLoaded':
            setEpubLoading(false);
            setEpubReady(true);
            break;
          case 'text':
            if (msg.data && msg.data.length > 0) {
              setCurrentChapterText(msg.data);
            }
            break;
          case 'error':
            Alert.alert('EPUB 渲染错误', msg.data || '未知错误');
            setEpubLoading(false);
            break;
        }
      } catch {
        // 忽略非 JSON 消息
      }
    },
    []
  );

  // ── 触发 AI 分析（使用真实提取的文本） ──
  const handleAnalyze = useCallback(
    async (taskType: TaskType) => {
      const label = taskType === 'summary' ? '核心提炼' : '深度自测';

      // 检查是否有可用的章节文本
      if (!currentChapterText || currentChapterText.trim().length < 50) {
        Alert.alert(
          '文本不足',
          '当前章节文本内容过短，请翻阅到正文内容较多的章节后再试'
        );
        return;
      }

      setPanelVisible(true);
      setPanelState('loading');
      setPanelTitle(label);
      setSummaryData(null);
      setQuizData(null);
      setUserAnswers({});
      setQuizSubmitted(false);
      setExpandedConcepts(new Set());

      try {
        const result = await analyzeChapter(currentChapterText, taskType);
        const parsed = parseContentJSON(result.content);

        if (taskType === 'summary') {
          setSummaryData(parsed as unknown as SummaryData);
          setPanelState('summary');
        } else {
          setQuizData(parsed as unknown as QuizData);
          setPanelState('quiz');
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '分析请求失败';
        Alert.alert('Cogito 分析失败', msg);
        setPanelVisible(false);
        setPanelState('idle');
      }
    },
    [currentChapterText]
  );

  const handleSelectOption = (questionId: number, label: string) => {
    if (quizSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [questionId]: label }));
  };

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true);
  };

  const toggleConcept = (idx: number) => {
    setExpandedConcepts((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ── 构建 epub.js HTML ──
  const epubHTML = useMemo(
    () => buildEpubHTML(colors.background, colors.text),
    [colors.background, colors.text]
  );

  // ── TXT 降级渲染 ──
  if (isTxtFile(fileName)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.fallbackContainer}>
          <Text style={[styles.fallbackIcon, { color: colors.textMuted }]}>
            TXT
          </Text>
          <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
            TXT 渲染引擎正在开发中，当前仅支持 EPUB 格式
          </Text>
          <TouchableOpacity
            style={[
              styles.fallbackBtn,
              { backgroundColor: colors.buttonBg, borderColor: colors.buttonBorder },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.fallbackBtnText, { color: colors.buttonText }]}>
              返回书架
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── EPUB 渲染 ──
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── EPUB 阅读区 ─── */}
      <View style={styles.epubContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: epubHTML }}
          style={styles.webview}
          containerStyle={styles.webviewContainer}
          onMessage={handleWebViewMessage}
          onLoadEnd={handleWebViewLoad}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          mixedContentMode="always"
        />

        {/* EPUB 加载遮罩 */}
        {epubLoading && (
          <View
            style={[
              styles.epubLoadingOverlay,
              { backgroundColor: colors.background },
            ]}
          >
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={[styles.epubLoadingText, { color: colors.textSecondary }]}>
              正在解析 EPUB 文件...
            </Text>
          </View>
        )}
      </View>

      {/* ─── 吸底控制栏 ─── */}
      <View
        style={[
          styles.controlBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.divider,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.controlBtn,
            { backgroundColor: colors.buttonBg, borderColor: colors.buttonBorder },
          ]}
          activeOpacity={0.8}
          onPress={() => handleAnalyze('summary')}
        >
          <Text style={[styles.controlBtnText, { color: colors.buttonText }]}>
            核心提炼
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlBtn,
            {
              backgroundColor: 'transparent',
              borderColor: colors.buttonBorder,
            },
          ]}
          activeOpacity={0.8}
          onPress={() => handleAnalyze('quiz')}
        >
          <Text
            style={[styles.controlBtnText, { color: colors.text }]}
          >
            深度自测
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Cogito 深度心智面板 ─── */}
      <Modal
        visible={panelVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setPanelVisible(false);
          setPanelState('idle');
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[styles.modalPanel, { backgroundColor: colors.surface }]}
          >
            {/* 面板头部 */}
            <View
              style={[styles.panelHeader, { borderBottomColor: colors.divider }]}
            >
              <Text style={[styles.panelTitle, { color: colors.cardTitle }]}>
                {panelTitle}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPanelVisible(false);
                  setPanelState('idle');
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.closeBtn, { color: colors.textSecondary }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── 加载状态 ── */}
            {panelState === 'loading' && <LoadingView colors={colors} />}

            {/* ── 摘要渲染 ── */}
            {panelState === 'summary' && summaryData && (
              <SummaryView
                data={summaryData}
                colors={colors}
                expandedConcepts={expandedConcepts}
                onToggleConcept={toggleConcept}
              />
            )}

            {/* ── 自测渲染 ── */}
            {panelState === 'quiz' && quizData && (
              <QuizView
                data={quizData}
                colors={colors}
                userAnswers={userAnswers}
                quizSubmitted={quizSubmitted}
                onSelectOption={handleSelectOption}
                onSubmit={handleSubmitQuiz}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 子组件：加载视图
// ---------------------------------------------------------------------------

function LoadingView({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.text} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Cogito 正在深度解析文本逻辑，请保持专注...
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 子组件：摘要视图
// ---------------------------------------------------------------------------

function SummaryView({
  data,
  colors,
  expandedConcepts,
  onToggleConcept,
}: {
  data: SummaryData;
  colors: ThemeColors;
  expandedConcepts: Set<number>;
  onToggleConcept: (idx: number) => void;
}) {
  return (
    <ScrollView
      style={styles.panelScroll}
      contentContainerStyle={styles.panelScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 核心论点大卡片 */}
      <View
        style={[
          styles.thesisCard,
          {
            backgroundColor: colors.background,
            borderLeftColor: colors.buttonBg,
          },
        ]}
      >
        <Text style={[styles.thesisLabel, { color: colors.cardTitle }]}>
          核心论点
        </Text>
        <Text style={[styles.thesisText, { color: colors.text }]}>
          {data.core_thesis}
        </Text>
      </View>

      {/* 逻辑链条 */}
      {data.logic_chain ? (
        <View
          style={[
            styles.logicChainCard,
            {
              backgroundColor: colors.background,
              borderLeftColor: colors.textMuted,
            },
          ]}
        >
          <Text style={[styles.thesisLabel, { color: colors.cardTitle }]}>
            逻辑链条
          </Text>
          <Text style={[styles.thesisText, { color: colors.text }]}>
            {data.logic_chain}
          </Text>
        </View>
      ) : null}

      {/* 核心概念链 */}
      <Text style={[styles.sectionTitle, { color: colors.cardTitle }]}>
        核心概念链
      </Text>

      {data.concept_map.map((item, idx) => {
        const expanded = expandedConcepts.has(idx);
        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.7}
            onPress={() => onToggleConcept(idx)}
            style={[
              styles.conceptCard,
              {
                backgroundColor: colors.background,
                borderColor: expanded ? colors.buttonBg : colors.divider,
              },
            ]}
          >
            <View style={styles.conceptHeader}>
              <Text style={[styles.conceptName, { color: colors.text }]}>
                {item.concept}
              </Text>
              <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
                {expanded ? '▾' : '▸'}
              </Text>
            </View>
            <Text
              style={[styles.conceptDef, { color: colors.textSecondary }]}
              numberOfLines={expanded ? undefined : 2}
            >
              {item.definition}
            </Text>

            {expanded && (
              <View style={styles.conceptDetail}>
                {item.relations.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.cardTitle }]}>
                      概念关系
                    </Text>
                    {item.relations.map((r, i) => (
                      <Text key={i} style={[styles.detailItem, { color: colors.text }]}>
                        · {r}
                      </Text>
                    ))}
                  </View>
                )}
                {item.evidence.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.cardTitle }]}>
                      原文论据
                    </Text>
                    {item.evidence.map((e, i) => (
                      <Text key={i} style={[styles.detailItem, { color: colors.text }]}>
                        "{e}"
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// 子组件：自测视图
// ---------------------------------------------------------------------------

function QuizView({
  data,
  colors,
  userAnswers,
  quizSubmitted,
  onSelectOption,
  onSubmit,
}: {
  data: QuizData;
  colors: ThemeColors;
  userAnswers: Record<number, string>;
  quizSubmitted: boolean;
  onSelectOption: (questionId: number, label: string) => void;
  onSubmit: () => void;
}) {
  const allAnswered =
    data.questions.length > 0 &&
    data.questions.every((q) => userAnswers[q.id] !== undefined);

  return (
    <ScrollView
      style={styles.panelScroll}
      contentContainerStyle={styles.panelScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {data.questions.map((question, qIdx) => {
        const selected = userAnswers[question.id];
        const isCorrect = selected === question.answer;

        return (
          <View
            key={question.id}
            style={[
              styles.quizCard,
              { backgroundColor: colors.background, borderColor: colors.divider },
            ]}
          >
            <Text style={[styles.quizStem, { color: colors.text }]}>
              {qIdx + 1}. {question.stem}
            </Text>

            {question.options.map((option) => {
              let optionStyle: object = {
                backgroundColor: colors.surface,
                borderColor: colors.divider,
              };
              let optionTextStyle: object = { color: colors.text };

              if (quizSubmitted) {
                if (option.label === question.answer) {
                  optionStyle = {
                    backgroundColor: '#1B4332',
                    borderColor: '#2D6A4F',
                  };
                  optionTextStyle = { color: '#95D5B2' };
                } else if (
                  option.label === selected &&
                  option.label !== question.answer
                ) {
                  optionStyle = {
                    backgroundColor: '#3D1A1A',
                    borderColor: '#6B2C2C',
                  };
                  optionTextStyle = { color: '#E5989B' };
                }
              } else if (option.label === selected) {
                optionStyle = {
                  backgroundColor: colors.buttonBg,
                  borderColor: colors.buttonBorder,
                };
                optionTextStyle = { color: colors.buttonText };
              }

              return (
                <TouchableOpacity
                  key={option.label}
                  activeOpacity={0.7}
                  onPress={() => onSelectOption(question.id, option.label)}
                  style={[styles.quizOption, optionStyle]}
                >
                  <Text style={[styles.quizOptionLabel, optionTextStyle]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.quizOptionText, optionTextStyle]}>
                    {option.text}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {quizSubmitted && (
              <View
                style={[styles.analysisCard, { borderTopColor: colors.divider }]}
              >
                <View style={styles.analysisHeader}>
                  <Text
                    style={[
                      styles.analysisBadge,
                      { color: isCorrect ? '#95D5B2' : '#E5989B' },
                    ]}
                  >
                    {isCorrect ? '✓ 回答正确' : '✗ 回答错误'}
                  </Text>
                </View>
                <Text
                  style={[styles.analysisText, { color: colors.textSecondary }]}
                >
                  {question.analysis}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {!quizSubmitted && (
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: allAnswered ? colors.buttonBg : colors.textMuted,
              opacity: allAnswered ? 1 : 0.5,
            },
          ]}
          activeOpacity={0.8}
          onPress={onSubmit}
          disabled={!allAnswered}
        >
          <Text style={[styles.submitBtnText, { color: colors.buttonText }]}>
            提交回答
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// 样式
// ---------------------------------------------------------------------------

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── EPUB 容器 ──
  epubContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webviewContainer: {
    flex: 1,
  },
  epubLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  epubLoadingText: {
    marginTop: 16,
    fontSize: 14,
  },

  // ── TXT 降级 ──
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  fallbackIcon: {
    fontSize: 48,
    fontWeight: '200',
    marginBottom: 20,
  },
  fallbackText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  fallbackBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  fallbackBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // ── 控制栏 ──
  controlBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    gap: 12,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalPanel: {
    height: SCREEN_HEIGHT * 0.78,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeBtn: {
    fontSize: 20,
    fontWeight: '300',
  },

  // ── 加载 ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── 面板滚动 ──
  panelScroll: {
    flex: 1,
  },
  panelScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // ── 摘要 ──
  thesisCard: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  thesisLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  thesisText: {
    fontSize: 15,
    lineHeight: 24,
  },
  logicChainCard: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  conceptCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  conceptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  conceptName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  expandIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  conceptDef: {
    fontSize: 13,
    lineHeight: 20,
  },
  conceptDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E6EA',
  },
  detailSection: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  detailItem: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 4,
  },

  // ── 自测 ──
  quizCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  quizStem: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
    marginBottom: 12,
  },
  quizOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  quizOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
    width: 20,
  },
  quizOptionText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  analysisCard: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  analysisHeader: {
    marginBottom: 8,
  },
  analysisBadge: {
    fontSize: 13,
    fontWeight: '700',
  },
  analysisText: {
    fontSize: 13,
    lineHeight: 21,
  },
  submitBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});