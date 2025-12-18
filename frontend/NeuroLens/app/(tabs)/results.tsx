import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Watch,
  Mic,
  PenTool,
  Brain,
  Check,
  AlertCircle,
  Info,
  ArrowLeft,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';

interface TestResult {
  id: string;
  title: string;
  percentage: number;
  icon: React.ComponentType<any>;
  iconColor: string;
  backgroundColor: string;
  status: 'good' | 'warning';
  description: string;
}

const TEST_RESULTS: TestResult[] = [
  {
    id: 'movement',
    title: 'Movement Analysis',
    percentage: 85,
    icon: Watch,
    iconColor: '#10B981',
    backgroundColor: '#D1FAE5',
    status: 'good',
    description: 'Tremor frequency within normal range. Gait pattern shows minor variations.',
  },
  {
    id: 'voice',
    title: 'Voice Analysis',
    percentage: 72,
    icon: Mic,
    iconColor: '#F97316',
    backgroundColor: '#FED7AA',
    status: 'warning',
    description: 'Slight voice tremor detected. Pitch variation slightly reduced.',
  },
  {
    id: 'motor',
    title: 'Motor Control',
    percentage: 78,
    icon: PenTool,
    iconColor: '#10B981',
    backgroundColor: '#D1FAE5',
    status: 'good',
    description: 'Drawing accuracy within expected range. Minor hesitation patterns observed.',
  },
  {
    id: 'cognitive',
    title: 'Cognitive Function',
    percentage: 92,
    icon: Brain,
    iconColor: '#10B981',
    backgroundColor: '#D1FAE5',
    status: 'good',
    description: 'Memory recall excellent. Response time within normal parameters.',
  },
];

const CircularProgress = ({ percentage, size = 120 }: { percentage: number; size?: number }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#14B8A6"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.progressContent, { width: size, height: size }]}>
        <Text style={styles.progressPercentage}>{percentage}%</Text>
        <Text style={styles.progressLabel}>Complete</Text>
      </View>
    </View>
  );
};

const ProgressBar = ({ percentage, color }: { percentage: number; color: string }) => {
  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
    </View>
  );
};

export default function ResultsScreen() {
  const router = useRouter();
  const overallScore = 82;

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
        <Text style={styles.headerTitle}>Assessment Results</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Score Card */}
        <View style={styles.overallScoreCard}>
          <Text style={styles.overallScoreCardLabel}>Overall Score</Text>
          <View style={styles.overallScoreHeader}>
            <View style={styles.overallScoreLeft}>
              <Text style={styles.overallScoreTitle}>Combined Analysis</Text>
              <View style={styles.statusBadge}>
                <Check size={12} color="#10B981" />
                <Text style={styles.statusBadgeText}>Normal</Text>
              </View>
            </View>
            <CircularProgress percentage={overallScore} />
          </View>
        </View>

        {/* Test Results Section */}
        <Text style={styles.sectionTitle}>Test Results</Text>

        {TEST_RESULTS.map((result) => {
          const IconComponent = result.icon;
          return (
            <View key={result.id} style={styles.testResultCard}>
              <View style={styles.testResultHeader}>
                <View style={[styles.iconContainer, { backgroundColor: result.backgroundColor }]}>
                  <IconComponent size={24} color={result.iconColor} />
                </View>
                <View style={styles.testResultContent}>
                  <Text style={styles.testResultTitle}>{result.title}</Text>
                  <ProgressBar percentage={result.percentage} color={result.iconColor} />
                </View>
                <View style={styles.testResultRight}>
                  <Text style={styles.testResultPercentage}>
                    {result.percentage}%
                  </Text>
                  {result.status === 'good' ? (
                    <View style={[styles.statusIcon, { backgroundColor: '#10B981' }]}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={[styles.statusIcon, { backgroundColor: '#F97316' }]}>
                      <AlertCircle size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.testResultDescription}>{result.description}</Text>
            </View>
          );
        })}

        {/* Recommendations Section */}
        <View style={styles.recommendationsCard}>
          <View style={styles.recommendationsHeader}>
            <View style={styles.infoIconContainer}>
              <Info size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.recommendationsTitle}>Recommendations</Text>
          </View>
          <View style={styles.recommendationsList}>
            <View style={styles.recommendationItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.recommendationText}>
                Continue regular assessments every 2 weeks
              </Text>
            </View>
            <View style={styles.recommendationItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.recommendationText}>
                Voice exercises may help improve speech clarity
              </Text>
            </View>
            <View style={styles.recommendationItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.recommendationText}>
                Share these results with your healthcare provider
              </Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          This assessment is for monitoring purposes only and does not constitute a medical
          diagnosis. Always consult with a qualified healthcare professional.
        </Text>

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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerPlaceholder: {
    width: 40,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  overallScoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  overallScoreCardLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 12,
  },
  overallScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overallScoreLeft: {
    flex: 1,
  },
  overallScoreTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  progressContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  testResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  testResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  testResultContent: {
    flex: 1,
  },
  testResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  testResultRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  testResultPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testResultDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  recommendationsCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    color: '#14B8A6',
    marginRight: 8,
    lineHeight: 22,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 22,
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});
