import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/services/api';

interface AssessmentEntry {
  id: string;
  date: string;
  rawDate: Date;
  overallScore: number; // This will be risk score (0-100, where lower is better)
  trend: 'up' | 'down' | 'stable';
  categories: {
    wearable: number; // Risk scores
    voice: number; // Risk scores
    drawing: number; // Risk scores
    brain: number; // Risk scores
  };
}

// Convert model percentage to risk score (invert: high percentage = low risk, low percentage = high risk)
const getRiskScore = (percentage: number): number => {
  return Math.round(100 - percentage);
};

// Determine risk level based on risk score
const getRiskLevel = (riskScore: number): 'low' | 'medium' | 'high' => {
  if (riskScore <= 30) return 'low';
  if (riskScore <= 60) return 'medium';
  return 'high';
};

// Get color based on risk level
const getRiskColor = (riskLevel: 'low' | 'medium' | 'high'): string => {
  switch (riskLevel) {
    case 'low':
      return '#10B981'; // Green
    case 'medium':
      return '#F97316'; // Orange
    case 'high':
      return '#EF4444'; // Red
  }
};

// Helper to create assessment entry with risk scores
// Input: model outputs (healthy percentages), output: risk scores
const createAssessmentEntry = (
  id: string,
  date: string,
  rawDate: Date,
  overallHealthy: number, // Model output (healthy percentage)
  categoriesHealthy: { wearable: number; voice: number; drawing: number; brain: number }
): AssessmentEntry => {
  const overallRisk = getRiskScore(overallHealthy);
  return {
    id,
    date,
    rawDate,
    overallScore: overallRisk, // Store as risk score
    trend: 'stable', // Will be calculated later
    categories: {
      wearable: getRiskScore(categoriesHealthy.wearable),
      voice: getRiskScore(categoriesHealthy.voice),
      drawing: getRiskScore(categoriesHealthy.drawing),
      brain: getRiskScore(categoriesHealthy.brain),
    },
  };
};

// Formatting helper
const formatDate = (isoString?: string) => {
  if (!isoString) return 'Unknown Date';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoString;
  }
};

const formatShortDate = (isoString?: string) => {
  if (!isoString) return '??';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
};

interface BackendHistoryEntry {
  id: string;
  timestamp: string;
  final_multimodal_risk: number;
  individual_scores: {
    wearable: number;
    voice: number;
    drawing: number;
    cognitive: number;
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 400;

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  const iconSize = 16;
  // For risk scores: down trend (risk decreased) = good (green), up trend (risk increased) = bad (red)
  const iconColor = trend === 'down' ? '#10B981' : trend === 'up' ? '#EF4444' : '#64748B';

  if (trend === 'up') {
    return <ArrowUp size={iconSize} color={iconColor} />;
  } else if (trend === 'down') {
    return <ArrowDown size={iconSize} color={iconColor} />;
  } else {
    return <Minus size={iconSize} color={iconColor} />;
  }
};

// Line Graph Component with enhanced styling
const LineGraph = ({ data, title }: { data: AssessmentEntry[]; title: string }) => {
  if (data.length === 0) {
    return (
      <View style={styles.graphContainer}>
        <Text style={styles.graphEmptyText}>No data available yet</Text>
      </View>
    );
  }

  // Responsive dimensions - use percentage-based calculation
  const containerPadding = isSmallScreen ? 24 : SCREEN_WIDTH < 600 ? 32 : 40;
  const maxGraphWidth = 600; // Max width for tablets
  const calculatedWidth = SCREEN_WIDTH - containerPadding * 2;
  const graphWidth = Math.min(Math.max(280, calculatedWidth), maxGraphWidth); // Min 280, max 600
  const graphHeight = isSmallScreen ? 160 : SCREEN_WIDTH < 600 ? 200 : SCREEN_WIDTH < 800 ? 240 : 260;
  const padding = isSmallScreen ? 28 : SCREEN_WIDTH < 600 ? 38 : SCREEN_WIDTH < 800 ? 45 : 50;
  const chartWidth = graphWidth - padding * 2;
  const chartHeight = graphHeight - padding * 2;

  // Responsive font sizes and stroke widths - matching app design
  const yAxisFontSize = isSmallScreen ? 10 : SCREEN_WIDTH < 600 ? 11 : 12;
  const xAxisFontSize = isSmallScreen ? 10 : SCREEN_WIDTH < 600 ? 11 : 12;
  const lineStrokeWidth = isSmallScreen ? 2.5 : 3;
  const circleRadius = isSmallScreen ? 4.5 : SCREEN_WIDTH < 600 ? 5.5 : 6;
  const circleStrokeWidth = isSmallScreen ? 2 : 2.5;
  const gridStrokeWidth = isSmallScreen ? 0.5 : 1;

  // Get scores and dates
  const scores = data.map(entry => entry.overallScore);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 100);
  const scoreRange = maxScore - minScore || 100;

  // Calculate points
  const points = data.map((entry, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((entry.overallScore - minScore) / scoreRange) * chartHeight;
    return { x, y, score: entry.overallScore, date: entry.date };
  });

  // Responsive Y-axis label positioning
  const yLabelX = padding - (isSmallScreen ? 8 : SCREEN_WIDTH < 600 ? 10 : 12);

  return (
    <View style={styles.graphContainer}>
      <Text style={styles.graphTitle}>{title}</Text>
      <View style={[styles.graphWrapper, { height: graphHeight }]}>
        <Svg
          width={graphWidth}
          height={graphHeight}
          viewBox={`0 0 ${graphWidth} ${graphHeight}`}
        >
          {/* Horizontal grid lines */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = padding + chartHeight - ((value - minScore) / scoreRange) * chartHeight;
            return (
              <Line
                key={value}
                x1={padding}
                y1={y}
                x2={graphWidth - padding}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth={gridStrokeWidth}
                strokeDasharray={isSmallScreen ? "3,3" : "4,4"}
                opacity={0.6}
              />
            );
          })}

          {/* Vertical lines from data points to x-axis */}
          {points.map((point, index) => {
            const xAxisY = graphHeight - padding - (isSmallScreen ? 12 : 16); // Position above date labels
            return (
              <Line
                key={`vertical-${index}`}
                x1={point.x}
                y1={padding}
                x2={point.x}
                y2={xAxisY}
                stroke="#E2E8F0"
                strokeWidth={gridStrokeWidth}
                strokeDasharray={isSmallScreen ? "3,3" : "4,4"}
                opacity={0.4}
              />
            );
          })}

          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = padding + chartHeight - ((value - minScore) / scoreRange) * chartHeight;
            return (
              <SvgText
                key={value}
                x={yLabelX}
                y={y + (yAxisFontSize / 3)}
                fontSize={yAxisFontSize}
                fill="#64748B"
                fontWeight="500"
                textAnchor="end"
              >
                {value}
              </SvgText>
            );
          })}

          {/* Line */}
          <Polyline
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#14B8A6"
            strokeWidth={lineStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={circleRadius}
              fill="#14B8A6"
              stroke="#FFFFFF"
              strokeWidth={circleStrokeWidth}
            />
          ))}

          {/* X-axis labels (dates) */}
          {points.map((point, index) => {
            // Show all labels if 5 or fewer, otherwise show every nth label
            const showLabel = data.length <= 5 || index % Math.ceil(data.length / 5) === 0 || index === data.length - 1;
            if (showLabel) {
              let shortDate = point.date;
              
              // If it's a "Wk Oct 12" format, keep it as is or shorten to "Oct 12"
              if (shortDate.startsWith('Wk ')) {
                // Keep as is or maybe remove 'Wk' if space is tight
                shortDate = shortDate.replace('Wk ', '');
              } else if (shortDate.includes(' ') && !isNaN(Date.parse(shortDate))) {
                // If it's something like "Oct 12, 2023", maybe just show "Oct 12"
                const parts = shortDate.split(' ');
                if (parts.length >= 2) {
                  shortDate = `${parts[0]} ${parts[1].replace(',', '')}`;
                }
              }
              
              return (
                <SvgText
                  key={index}
                  x={point.x}
                  y={graphHeight - (isSmallScreen ? 8 : 10)}
                  fontSize={xAxisFontSize}
                  fill="#64748B"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {shortDate}
                </SvgText>
              );
            }
            return null;
          })}
        </Svg>
      </View>
    </View>
  );
};

export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<AssessmentEntry[]>([]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/multimodal/history');
      const raw: BackendHistoryEntry[] = response.data;

      const entries: AssessmentEntry[] = raw.map((item, index) => {
        const overallScore = Math.round(item.final_multimodal_risk);
        const prevScore = index < raw.length - 1 ? raw[index + 1].final_multimodal_risk : null;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (prevScore !== null) {
          if (overallScore > prevScore + 2) trend = 'up';
          else if (overallScore < prevScore - 2) trend = 'down';
        }

        return {
          id: item.id,
          date: formatDate(item.timestamp),
          rawDate: new Date(item.timestamp),
          overallScore,
          trend,
          categories: {
            wearable: Math.round(item.individual_scores.wearable),
            voice: Math.round(item.individual_scores.voice),
            drawing: Math.round(item.individual_scores.drawing),
            brain: Math.round(item.individual_scores.cognitive),
          },
        };
      });

      setHistoryData(entries);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load assessment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const totalAssessments = historyData.length;
  const averageRisk = totalAssessments > 0
    ? Math.round(historyData.reduce((sum, e) => sum + e.overallScore, 0) / totalAssessments)
    : 0;

  // Aggregation helpers
  const aggregateData = (data: AssessmentEntry[], period: 'day' | 'week' | 'month') => {
    if (data.length === 0) return [];

    const groups: Record<string, AssessmentEntry[]> = {};
    
    data.forEach(entry => {
      let key = '';
      const d = entry.rawDate;
      
      if (period === 'day') {
        // Key by YYYY-MM-DD for accurate grouping across years
        key = d.toISOString().split('T')[0];
      } else if (period === 'week') {
        // Group by year and week number
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        key = `${startOfWeek.getFullYear()}-W${Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
      } else if (period === 'month') {
        key = `${d.getFullYear()}-${d.getMonth()}`;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });

    return Object.keys(groups).map(key => {
      const groupEntries = groups[key];
      const count = groupEntries.length;
      const d = groupEntries[0].rawDate;
      
      let displayDate = '';
      if (period === 'day') {
        displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (period === 'week') {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        displayDate = `Wk ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else if (period === 'month') {
        displayDate = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      return {
        id: key,
        date: displayDate,
        rawDate: d,
        overallScore: Math.round(groupEntries.reduce((sum, e) => sum + e.overallScore, 0) / count),
        trend: 'stable' as const,
        categories: {
          wearable: Math.round(groupEntries.reduce((sum, e) => sum + e.categories.wearable, 0) / count),
          voice: Math.round(groupEntries.reduce((sum, e) => sum + e.categories.voice, 0) / count),
          drawing: Math.round(groupEntries.reduce((sum, e) => sum + e.categories.drawing, 0) / count),
          brain: Math.round(groupEntries.reduce((sum, e) => sum + e.categories.brain, 0) / count),
        }
      };
    }).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  };

  // Filter and aggregate for graphs
  const dailyData = aggregateData(historyData, 'day').slice(-7);
  const weeklyData = aggregateData(historyData, 'week').slice(-6);
  const monthlyData = aggregateData(historyData, 'month').slice(-6);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('history.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Swipeable Progress Cards */}
        <View style={styles.swiperContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.swiper}
          >
            {/* Daily Progress Card */}
            <View style={styles.progressCard}>
              <LineGraph data={dailyData} title={t('history.graphs.daily')} />
            </View>

            {/* Weekly Progress Card */}
            <View style={styles.progressCard}>
              <LineGraph data={weeklyData} title={t('history.graphs.weekly')} />
            </View>

            {/* Monthly Progress Card */}
            <View style={styles.progressCard}>
              <LineGraph data={monthlyData} title={t('history.graphs.monthly')} />
            </View>
          </ScrollView>

          {/* Page Indicators */}
          <View style={styles.pageIndicators}>
            <View style={[styles.indicator, activeIndex === 0 && styles.indicatorActive]} />
            <View style={[styles.indicator, activeIndex === 1 && styles.indicatorActive]} />
            <View style={[styles.indicator, activeIndex === 2 && styles.indicatorActive]} />
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('history.summary.totalAssessments')}</Text>
            <Text style={styles.summaryValue}>{totalAssessments}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('history.summary.averageRisk')}</Text>
            <Text style={[styles.summaryValue, { color: getRiskColor(getRiskLevel(averageRisk)) }]}>
              {averageRisk}%
            </Text>
          </View>
        </View>

        {/* Assessment History Entries */}
        {historyData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No assessments found yet.</Text>
          </View>
        ) : (
          historyData.map((entry) => (
            <View key={entry.id} style={styles.assessmentCard}>
              {/* Date and Overall Score Row */}
              <View style={styles.assessmentHeader}>
                <View style={styles.dateContainer}>
                  <Calendar size={18} color="#64748B" />
                  <Text style={styles.dateText}>{entry.date}</Text>
                </View>
                <View style={styles.scoreContainer}>
                  <TrendIcon trend={entry.trend} />
                  <Text style={[styles.overallScoreText, { color: getRiskColor(getRiskLevel(entry.overallScore)) }]}>
                    {entry.overallScore}%
                  </Text>
                </View>
              </View>

              {/* Category Scores */}
              <View style={styles.categoriesContainer}>
                <View style={styles.categoryItem}>
                  <Text style={styles.categoryLabel}>{t('history.categories.wearable')}</Text>
                  <Text style={[styles.categoryScore, { color: getRiskColor(getRiskLevel(entry.categories.wearable)) }]}>
                    {entry.categories.wearable}%
                  </Text>
                </View>
                <View style={styles.categoryItem}>
                  <Text style={styles.categoryLabel}>{t('history.categories.voice')}</Text>
                  <Text style={[styles.categoryScore, { color: getRiskColor(getRiskLevel(entry.categories.voice)) }]}>
                    {entry.categories.voice}%
                  </Text>
                </View>
                <View style={styles.categoryItem}>
                  <Text style={styles.categoryLabel}>{t('history.categories.drawing')}</Text>
                  <Text style={[styles.categoryScore, { color: getRiskColor(getRiskLevel(entry.categories.drawing)) }]}>
                    {entry.categories.drawing}%
                  </Text>
                </View>
                <View style={styles.categoryItem}>
                  <Text style={styles.categoryLabel}>{t('history.categories.brain')}</Text>
                  <Text style={[styles.categoryScore, { color: getRiskColor(getRiskLevel(entry.categories.brain)) }]}>
                    {entry.categories.brain}%
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#14B8A6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isSmallScreen ? 12 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    marginRight: isSmallScreen ? 8 : 12,
  },
  headerPlaceholder: {
    width: 0,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scrollContent: {
    padding: isSmallScreen ? 12 : 20,
  },
  swiperContainer: {
    marginBottom: isSmallScreen ? 16 : 20,
  },
  swiper: {
    marginBottom: 12,
  },
  progressCard: {
    width: SCREEN_WIDTH - (isSmallScreen ? 24 : SCREEN_WIDTH < 600 ? 40 : SCREEN_WIDTH < 768 ? 60 : 80),
    marginHorizontal: isSmallScreen ? 6 : SCREEN_WIDTH < 600 ? 10 : SCREEN_WIDTH < 768 ? 15 : 20,
    alignItems: 'center',
    maxWidth: 600, // Prevent cards from getting too wide on tablets
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: '#14B8A6',
  },
  summaryCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: isSmallScreen ? 16 : 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'flex-start',
    flex: 1,
  },
  summaryLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#0F172A',
    marginBottom: isSmallScreen ? 6 : 8,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: isSmallScreen ? 24 : 32,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  summaryValueGreen: {
    color: '#10B981',
  },
  summaryDivider: {
    width: 1,
    height: isSmallScreen ? 40 : 50,
    backgroundColor: '#A7F3D0',
  },
  assessmentCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 14 : 20,
    marginBottom: isSmallScreen ? 12 : 16,
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 6 : 8,
    flex: 1,
  },
  dateText: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#0F172A',
    flexShrink: 1,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 4 : 6,
    marginLeft: 8,
  },
  overallScoreText: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  categoryItem: {
    ...(isSmallScreen ? {
      width: '48%',
      maxWidth: '48%',
    } : {
      width: '22%',
      maxWidth: '22%',
    }),
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : 0,
  },
  categoryLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryScore: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  graphContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 16 : SCREEN_WIDTH < 600 ? 20 : 24,
    marginBottom: isSmallScreen ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  graphTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: isSmallScreen ? 12 : 16,
    letterSpacing: -0.2,
  },
  graphWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 600, // Prevent graph from getting too wide on tablets
    alignSelf: 'center',
    overflow: 'visible',
  },
  graphEmptyText: {
    fontSize: isSmallScreen ? 13 : SCREEN_WIDTH < 600 ? 15 : 16,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: isSmallScreen ? 50 : SCREEN_WIDTH < 600 ? 70 : 80,
  },
});
