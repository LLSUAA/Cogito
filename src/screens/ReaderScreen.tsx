import React, { useMemo, useState, useCallback } from 'react';
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
import { WebView } from 'react-native-webview';

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
// 占位用高壁垒金融哲学文本 (~3000 字)
// ---------------------------------------------------------------------------

const PLACEHOLDER_TEXT = `价值投资的认知谬误：从格雷厄姆到行为金融学的范式革命

第一章：安全边际的形而上学根基

在金融思想史中，本杰明·格雷厄姆提出的"安全边际"概念，表面上是一个量化投资准则，实质上却承载着深刻的哲学预设。要理解这一概念，我们必须首先追问：市场价格在何种意义上可以被视为"错误"的？

格雷厄姆的回答建立在一种近乎柏拉图式的实在论预设之上——存在一个客观的、独立于市场参与者认知的"内在价值"。这个内在价值不是市场共识的产物，而是企业未来现金流的折现总和的"真实"反映。市场价格的波动，在格雷厄姆看来，不过是人类情绪的非理性涟漪，而内在价值则是静水深流的客观实在。

然而，这一预设在行为金融学兴起后遭遇了根本性的挑战。如果市场参与者本身就是价格的创造者，而非价格的发现者，那么"内在价值"这个概念就失去了其形而上学的地基——它不再是一个可以被"发现"的客观实体，而是一个被"建构"的社会共识。

索罗斯在其《金融炼金术》中提出了"反身性理论"，从根本上动摇了传统价值投资的认知框架。他指出，市场参与者的认知本身就会改变他们所试图认知的对象——当投资者相信某只股票被低估而大量买入时，这一行为本身就推高了股价，从而改变了"低估"这一判断的前提条件。这就是认知与实在之间的反身性循环。

从分析哲学的角度看，格雷厄姆的价值投资理论犯了一个范畴错误：他将"价值"这个规范性概念错误地归入了描述性范畴。"内在价值"并非一个可以被经验验证的事实陈述，而是一个包含价值判断的规范性命题。当我们说"这只股票的内在价值是每股100元"时，我们实际上在表达一个包含"应当"的命题——"在理性条件下，这只股票的价格应当趋近于每股100元。"

第二章：行为金融学的革命性颠覆

丹尼尔·卡尼曼和阿莫斯·特沃斯基的前景理论，为理解金融市场的非理性行为提供了系统的认知心理学框架。他们发现，人类在面对收益时表现出风险厌恶，而面对损失时则表现出风险寻求——这种不对称性直接违背了传统经济学中的理性人假设。

损失厌恶是前景理论的核心洞见之一：同等数量的损失带来的心理痛苦，大约是同等数量收益带来的心理快感的2.25倍。这一发现对价值投资具有深远的影响——它解释了为什么市场在下跌时往往出现过度恐慌，而在上涨时则相对温和。投资者的"安全边际"需求，实质上可以被理解为对损失厌恶的心理补偿机制。

然而，这里存在一个更深层的悖论：如果价值投资者试图利用市场参与者的非理性行为获利，那么他们自身是否也受制于这些非理性偏差？巴菲特的著名格言"在别人恐惧时贪婪，在别人贪婪时恐惧"看似简单，实则需要一种近乎超人的认知能力——能够识别并超越自身的心理偏差。这本身就是一种认知悖论。

理查德·塞勒提出的"心理账户"理论进一步揭示了价值投资者的认知困境。投资者往往将资金划分为不同的心理账户（如"本金"与"利润"），并对不同账户中的资金采取不同的风险态度。这种心理分割行为，与价值投资所要求的理性统一决策框架形成了尖锐的矛盾。

第三章：适应性市场假说与复杂系统视角

安德鲁·罗的适应性市场假说为价值投资提供了第三种解释框架。他借鉴演化生物学和复杂系统理论，提出金融市场是一个由不同策略不断竞争、适应和演化的生态系统。在这个框架中，"内在价值"不是一个静态的均衡点，而是一个动态的演化吸引子。

从复杂系统的视角出发，价值投资可以被理解为一种在噪音中识别信号的自适应策略。市场价格的短期波动是系统噪音，而长期均值回归则是系统信号。价值投资者的任务，不是在噪音中预测每一个波动，而是识别出那些被噪音暂时掩盖的长期信号。

但这一框架同样面临挑战：如果市场本身是一个演化系统，过去的均值回归模式在未来是否仍然有效？尼古拉斯·塔勒布在其《黑天鹅》中警告我们，金融市场的统计分布具有"肥尾"特征——极端事件发生的概率远比正态分布预测的要高。那些被价值投资者视为"非理性"的极端价格波动，恰恰可能是系统在面临结构性变化时的理性适应。

第四章：从认知科学到深度阅读的实践意义

对价值投资哲学的深入剖析，揭示了一个更为根本的认知问题：我们如何从复杂文本中提取真正有意义的洞见，而非仅仅停留在表面观点的复述上？这正是《深读》项目的核心使命。

真正的深度阅读，要求读者能够：第一，识别文本中隐含的哲学预设和方法论前提；第二，把握论证的逻辑结构，而非孤立地记忆结论；第三，将不同理论框架进行横向比较，发现其中的张力与互补关系；第四，在理解的基础上进行批判性反思，形成自己的独立判断。

这就是为什么我们设计了"核心提炼"与"深度自测"两种思维训练模式。前者帮助你构建文本的逻辑骨架，后者则通过精心设计的反常识问题，检验你是否真正穿透了文字的表层，触及了思想的底层结构。`;

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
// 主组件
// ---------------------------------------------------------------------------

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

  // ── 面板状态 ──
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [panelTitle, setPanelTitle] = useState('');

  // ── 摘要数据 ──
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [expandedConcepts, setExpandedConcepts] = useState<Set<number>>(
    new Set()
  );

  // ── 自测数据 ──
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // ── 触发分析 ──
  const handleAnalyze = useCallback(
    async (taskType: TaskType) => {
      const label = taskType === 'summary' ? '核心提炼' : '深度自测';
      setPanelVisible(true);
      setPanelState('loading');
      setPanelTitle(label);
      setSummaryData(null);
      setQuizData(null);
      setUserAnswers({});
      setQuizSubmitted(false);
      setExpandedConcepts(new Set());

      try {
        const result = await analyzeChapter(PLACEHOLDER_TEXT, taskType);
        const parsed = parseContentJSON(result.content);

        if (taskType === 'summary') {
          setSummaryData(parsed as unknown as SummaryData);
          setPanelState('summary');
        } else {
          setQuizData(parsed as unknown as QuizData);
          setPanelState('quiz');
        }
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : '分析请求失败';
        Alert.alert('Cogito 分析失败', msg);
        setPanelVisible(false);
        setPanelState('idle');
      }
    },
    []
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
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // ── 渲染 ──
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── WebView 全屏渲染 ─── */}
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        containerStyle={styles.webviewContainer}
      />

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
            style={[
              styles.controlBtnText,
              { color: colors.text },
            ]}
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
            style={[
              styles.modalPanel,
              { backgroundColor: colors.surface },
            ]}
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
            {panelState === 'loading' && (
              <LoadingView colors={colors} />
            )}

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
                    <Text
                      style={[styles.detailLabel, { color: colors.cardTitle }]}
                    >
                      概念关系
                    </Text>
                    {item.relations.map((r, i) => (
                      <Text
                        key={i}
                        style={[styles.detailItem, { color: colors.text }]}
                      >
                        · {r}
                      </Text>
                    ))}
                  </View>
                )}
                {item.evidence.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text
                      style={[styles.detailLabel, { color: colors.cardTitle }]}
                    >
                      原文论据
                    </Text>
                    {item.evidence.map((e, i) => (
                      <Text
                        key={i}
                        style={[styles.detailItem, { color: colors.text }]}
                      >
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
              {
                backgroundColor: colors.background,
                borderColor: colors.divider,
              },
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
                  // 正确答案
                  optionStyle = {
                    backgroundColor: '#1B4332',
                    borderColor: '#2D6A4F',
                  };
                  optionTextStyle = { color: '#95D5B2' };
                } else if (
                  option.label === selected &&
                  option.label !== question.answer
                ) {
                  // 错误选择
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

            {/* 提交后展开解析 */}
            {quizSubmitted && (
              <View
                style={[
                  styles.analysisCard,
                  { borderTopColor: colors.divider },
                ]}
              >
                <View style={styles.analysisHeader}>
                  <Text
                    style={[
                      styles.analysisBadge,
                      {
                        color: isCorrect ? '#95D5B2' : '#E5989B',
                      },
                    ]}
                  >
                    {isCorrect ? '✓ 回答正确' : '✗ 回答错误'}
                  </Text>
                </View>
                <Text style={[styles.analysisText, { color: colors.textSecondary }]}>
                  {question.analysis}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {/* 提交按钮 */}
      {!quizSubmitted && (
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: allAnswered
                ? colors.buttonBg
                : colors.textMuted,
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
// HTML 模板构建
// ---------------------------------------------------------------------------

function buildReaderHTML(
  fileName: string,
  bgColor: string,
  textColor: string
): string {
  const escapedText = PLACEHOLDER_TEXT.replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background-color: ${bgColor};
      color: ${textColor};
      font-family: -apple-system, "PingFang SC", "Noto Serif SC", "Source Han Serif SC", Georgia, serif;
      font-size: 17px; line-height: 1.8;
      -webkit-font-smoothing: antialiased;
    }
    .reader-container {
      max-width: 720px; margin: 0 auto;
      padding: 24px 20px 48px;
    }
    .reader-header {
      text-align: center; padding-bottom: 24px; margin-bottom: 24px;
      border-bottom: 1px solid ${textColor}1A;
    }
    .reader-header h1 {
      font-size: 22px; font-weight: 700; letter-spacing: 1px;
    }
    .reader-body { color: ${textColor}; }
    .reader-body p { margin-bottom: 16px; text-indent: 2em; }
    .chapter-title {
      font-size: 18px; font-weight: 700; margin: 24px 0 12px;
      text-indent: 0; text-align: center;
    }
  </style>
</head>
<body>
  <div class="reader-container">
    <div class="reader-header">
      <h1>${escapeHTML(fileName)}</h1>
    </div>
    <div class="reader-body">
      ${PLACEHOLDER_TEXT.split('\n\n')
        .map((block) => {
          const trimmed = block.trim();
          if (!trimmed) return '';
          if (trimmed.startsWith('第') && trimmed.includes('章')) {
            return `<p class="chapter-title">${escapeHTML(trimmed)}</p>`;
          }
          return `<p>${escapeHTML(trimmed)}</p>`;
        })
        .join('\n')}
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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