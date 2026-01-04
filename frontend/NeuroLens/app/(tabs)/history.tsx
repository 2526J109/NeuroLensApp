import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowLeft,
} from 'lucide-react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

interface AssessmentEntry {
  id: string;
  date: string;
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
  overallHealthy: number, // Model output (healthy percentage)
  categoriesHealthy: { wearable: number; voice: number; drawing: number; brain: number }
): AssessmentEntry => {
  const overallRisk = getRiskScore(overallHealthy);
  return {
    id,
    date,
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

// Assessment history with model outputs (will be converted to risk scores)
const ASSESSMENT_HISTORY_RAW = [
  {
    id: '1',
    date: 'Dec 12,2025',
    overallHealthy: 78, // Model output: 78% healthy = 22% risk
    categoriesHealthy: { wearable: 82, voice: 75, drawing: 80, brain: 76 },
  },
  {
    id: '2',
    date: 'Dec 5,2025',
    overallHealthy: 75, // Model output: 75% healthy = 25% risk
    categoriesHealthy: { wearable: 78, voice: 72, drawing: 77, brain: 73 },
  },
  {
    id: '3',
    date: 'Nov 28,2025',
    overallHealthy: 74, // Model output: 74% healthy = 26% risk
    categoriesHealthy: { wearable: 76, voice: 70, drawing: 75, brain: 75 },
  },
  {
    id: '4',
    date: 'Nov 21,2025',
    overallHealthy: 77, // Model output: 77% healthy = 23% risk
    categoriesHealthy: { wearable: 80, voice: 74, drawing: 78, brain: 76 },
  },
  {
    id: '5',
    date: 'Nov 14,2025',
    overallHealthy: 72, // Model output: 72% healthy = 28% risk
    categoriesHealthy: { wearable: 74, voice: 68, drawing: 73, brain: 73 },
  },
];

// Convert to risk scores
const ASSESSMENT_HISTORY_BASE: AssessmentEntry[] = ASSESSMENT_HISTORY_RAW.map((entry) => {
  return createAssessmentEntry(
    entry.id,
    entry.date,
    entry.overallHealthy,
    entry.categoriesHealthy
  );
});

// Calculate trends (for risk: lower is better, so down trend = improving, up trend = worsening)
const ASSESSMENT_HISTORY: AssessmentEntry[] = ASSESSMENT_HISTORY_BASE.map((entry, index) => {
  if (index === 0) {
    return { ...entry, trend: 'stable' as const };
  }
  
  const prevRisk = ASSESSMENT_HISTORY_BASE[index - 1].overallScore;
  const currentRisk = entry.overallScore;
  const diff = currentRisk - prevRisk;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(diff) <= 1) {
    trend = 'stable';
  } else if (diff < 0) {
    trend = 'down'; // Risk decreased = good (green)
  } else {
    trend = 'up'; // Risk increased = bad (red)
  }
  
  return { ...entry, trend };
});

const TOTAL_ASSESSMENTS = ASSESSMENT_HISTORY.length;
const AVERAGE_SCORE = Math.round(
  ASSESSMENT_HISTORY.reduce((sum, entry) => sum + entry.overallScore, 0) / ASSESSMENT_HISTORY.length
);

// Monthly data (last 6 months)
const MONTHLY_DATA_RAW = [
  { id: '1', date: 'Dec 2025', overallHealthy: 78, categoriesHealthy: { wearable: 82, voice: 75, drawing: 80, brain: 76 } },
  { id: '2', date: 'Nov 2025', overallHealthy: 75, categoriesHealthy: { wearable: 78, voice: 72, drawing: 77, brain: 73 } },
  { id: '3', date: 'Oct 2025', overallHealthy: 74, categoriesHealthy: { wearable: 76, voice: 70, drawing: 75, brain: 75 } },
  { id: '4', date: 'Sep 2025', overallHealthy: 77, categoriesHealthy: { wearable: 80, voice: 74, drawing: 78, brain: 76 } },
  { id: '5', date: 'Aug 2025', overallHealthy: 72, categoriesHealthy: { wearable: 74, voice: 68, drawing: 73, brain: 73 } },
  { id: '6', date: 'Jul 2025', overallHealthy: 76, categoriesHealthy: { wearable: 79, voice: 73, drawing: 77, brain: 75 } },
];

// Weekly data (last 4 weeks)
const WEEKLY_DATA_RAW = [
  { id: '1', date: 'Week 4', overallHealthy: 78, categoriesHealthy: { wearable: 82, voice: 75, drawing: 80, brain: 76 } },
  { id: '2', date: 'Week 3', overallHealthy: 75, categoriesHealthy: { wearable: 78, voice: 72, drawing: 77, brain: 73 } },
  { id: '3', date: 'Week 2', overallHealthy: 74, categoriesHealthy: { wearable: 76, voice: 70, drawing: 75, brain: 75 } },
  { id: '4', date: 'Week 1', overallHealthy: 77, categoriesHealthy: { wearable: 80, voice: 74, drawing: 78, brain: 76 } },
];

// Daily data (last 7 days)
const DAILY_DATA_RAW = [
  { id: '1', date: 'Dec 12,2025', overallHealthy: 78, categoriesHealthy: { wearable: 82, voice: 75, drawing: 80, brain: 76 } },
  { id: '2', date: 'Dec 11,2025', overallHealthy: 75, categoriesHealthy: { wearable: 78, voice: 72, drawing: 77, brain: 73 } },
  { id: '3', date: 'Dec 10,2025', overallHealthy: 74, categoriesHealthy: { wearable: 76, voice: 70, drawing: 75, brain: 75 } },
  { id: '4', date: 'Dec 9,2025', overallHealthy: 77, categoriesHealthy: { wearable: 80, voice: 74, drawing: 78, brain: 76 } },
  { id: '5', date: 'Dec 8,2025', overallHealthy: 76, categoriesHealthy: { wearable: 79, voice: 73, drawing: 77, brain: 75 } },
  { id: '6', date: 'Dec 7,2025', overallHealthy: 73, categoriesHealthy: { wearable: 75, voice: 71, drawing: 74, brain: 72 } },
  { id: '7', date: 'Dec 6,2025', overallHealthy: 75, categoriesHealthy: { wearable: 77, voice: 73, drawing: 76, brain: 74 } },
];

// Convert monthly data to risk scores
const MONTHLY_DATA_BASE: AssessmentEntry[] = MONTHLY_DATA_RAW.map((entry) => {
  return createAssessmentEntry(
    entry.id,
    entry.date,
    entry.overallHealthy,
    entry.categoriesHealthy
  );
});

const MONTHLY_DATA: AssessmentEntry[] = MONTHLY_DATA_BASE.map((entry, index) => {
  if (index === 0) {
    return { ...entry, trend: 'stable' as const };
  }
  
  const prevRisk = MONTHLY_DATA_BASE[index - 1].overallScore;
  const currentRisk = entry.overallScore;
  const diff = currentRisk - prevRisk;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(diff) <= 1) {
    trend = 'stable';
  } else if (diff < 0) {
    trend = 'down';
  } else {
    trend = 'up';
  }
  
  return { ...entry, trend };
});

// Convert weekly data to risk scores
const WEEKLY_DATA_BASE: AssessmentEntry[] = WEEKLY_DATA_RAW.map((entry) => {
  return createAssessmentEntry(
    entry.id,
    entry.date,
    entry.overallHealthy,
    entry.categoriesHealthy
  );
});

const WEEKLY_DATA: AssessmentEntry[] = WEEKLY_DATA_BASE.map((entry, index) => {
  if (index === 0) {
    return { ...entry, trend: 'stable' as const };
  }
  
  const prevRisk = WEEKLY_DATA_BASE[index - 1].overallScore;
  const currentRisk = entry.overallScore;
  const diff = currentRisk - prevRisk;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(diff) <= 1) {
    trend = 'stable';
  } else if (diff < 0) {
    trend = 'down';
  } else {
    trend = 'up';
  }
  
  return { ...entry, trend };
});

// Convert daily data to risk scores
const DAILY_DATA_BASE: AssessmentEntry[] = DAILY_DATA_RAW.map((entry) => {
  return createAssessmentEntry(
    entry.id,
    entry.date,
    entry.overallHealthy,
    entry.categoriesHealthy
  );
});

const DAILY_DATA: AssessmentEntry[] = DAILY_DATA_BASE.map((entry, index) => {
  if (index === 0) {
    return { ...entry, trend: 'stable' as const };
  }
  
  const prevRisk = DAILY_DATA_BASE[index - 1].overallScore;
  const currentRisk = entry.overallScore;
  const diff = currentRisk - prevRisk;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(diff) <= 1) {
    trend = 'stable';
  } else if (diff < 0) {
    trend = 'down';
  } else {
    trend = 'up';
  }
  
  return { ...entry, trend };
});

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
              // Handle different date formats
              let shortDate = point.date;
              if (point.date.includes(',')) {
                // Format: 'Dec 12,2025' -> 'Dec 12'
                const dateParts = point.date.split(',');
                shortDate = dateParts[0];
              } else if (point.date.includes('Week')) {
                // Format: 'Week 4' -> keep as is
                shortDate = point.date;
              } else if (point.date.includes(' ')) {
                // Format: 'Dec 2025' -> 'Dec'
                const dateParts = point.date.split(' ');
                shortDate = dateParts[0];
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
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    setActiveIndex(index);
  };

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
        <Text style={styles.headerTitle}>History</Text>
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
              <LineGraph data={DAILY_DATA} title="Daily Risk Score Progress" />
            </View>

            {/* Weekly Progress Card */}
            <View style={styles.progressCard}>
              <LineGraph data={WEEKLY_DATA} title="Weekly Risk Score Progress" />
            </View>

            {/* Monthly Progress Card */}
            <View style={styles.progressCard}>
              <LineGraph data={MONTHLY_DATA} title="Monthly Risk Score Progress" />
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
            <Text style={styles.summaryLabel}>Total Assessments</Text>
            <Text style={styles.summaryValue}>{TOTAL_ASSESSMENTS}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Average Risk</Text>
            <Text style={[styles.summaryValue, { color: getRiskColor(getRiskLevel(AVERAGE_SCORE)) }]}>
              {AVERAGE_SCORE}%
            </Text>
          </View>
        </View>

        {/* Assessment History Entries */}
        {ASSESSMENT_HISTORY.map((entry) => (
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
                <Text style={styles.categoryLabel}>Wearable</Text>
                <Text style={[styles.categoryScore, { color: getRiskColor(getRiskLevel(entry.categories.wearable)) }]}>
                  {entry.categories.wearable}%
                </Text>
              </View>
              <View style={styles.categoryItem}>
                <Text style={styles.categoryLabel}>Voice</Text>
                <Text style={[styles.categoryScore, { color: getRiskColor(getRiskLevel(entry.categories.voice)) }]}>
                  {entry.categories.voice}%
                </Text>
              </View>
              <View style={styles.categoryItem}>
                <Text style={styles.categoryLabel}>Drawing</Text>
                <Text style={[styles.categoryScore, { color: getRiskColor(getRiskLevel(entry.categories.drawing)) }]}>
                  {entry.categories.drawing}%
                </Text>
              </View>
              <View style={styles.categoryItem}>
                <Text style={styles.categoryLabel}>Brain</Text>
                <Text style={[styles.categoryScore, { color: getRiskColor(getRiskLevel(entry.categories.brain)) }]}>
                  {entry.categories.brain}%
                </Text>
              </View>
            </View>
          </View>
        ))}

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
