import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
// No API import needed - results passed directly via route params

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

// Default test results (fallback)
const DEFAULT_TEST_RESULTS: TestResult[] = [
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;

const CircularProgress = ({ percentage, size }: { percentage: number; size?: number }) => {
  const defaultSize = isSmallScreen ? 100 : 120;
  const progressSize = size || defaultSize;
  const strokeWidth = 8;
  const radius = (progressSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: progressSize, height: progressSize }}>
      <Svg width={progressSize} height={progressSize}>
        {/* Background circle */}
        <Circle
          cx={progressSize / 2}
          cy={progressSize / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={progressSize / 2}
          cy={progressSize / 2}
          r={radius}
          stroke="#14B8A6"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${progressSize / 2} ${progressSize / 2})`}
        />
      </Svg>
      <View style={[styles.progressContent, { width: progressSize, height: progressSize }]}>
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
  const params = useLocalSearchParams();
  const [testResults, setTestResults] = useState<TestResult[]>(DEFAULT_TEST_RESULTS);
  const [overallScore, setOverallScore] = useState(82);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get voice analysis result from route params (passed directly, no database)
    const voiceAnalysisResultParam = params.voiceAnalysisResult as string;
    if (voiceAnalysisResultParam) {
      try {
        const voiceResult = JSON.parse(voiceAnalysisResultParam);
        
        // Update voice analysis result
        const updatedResults = [...DEFAULT_TEST_RESULTS];
        const voiceIndex = updatedResults.findIndex(r => r.id === 'voice');
        
        if (voiceIndex !== -1) {
          updatedResults[voiceIndex] = {
            ...updatedResults[voiceIndex],
            percentage: voiceResult.percentage || 0,
            status: voiceResult.status === 'good' ? 'good' : 'warning',
            description: voiceResult.description || 'Voice analysis completed',
            iconColor: voiceResult.status === 'good' ? '#10B981' : '#F97316',
            backgroundColor: voiceResult.status === 'good' ? '#D1FAE5' : '#FED7AA',
          };
        }
        
        setTestResults(updatedResults);
        
        // Recalculate overall score (average of all test results)
        const avgScore = updatedResults.reduce((sum, r) => sum + r.percentage, 0) / updatedResults.length;
        setOverallScore(Math.round(avgScore));
      } catch (error) {
        console.error('Error parsing voice analysis result:', error);
        // Keep default results on error
      }
    }
  }, [params.voiceAnalysisResult]);

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

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#14B8A6" />
            <Text style={styles.loadingText}>Loading voice analysis results...</Text>
          </View>
        )}

        {testResults.map((result) => {
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
    justifyContent: 'flex-start',
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
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'left',
    flex: 1,
  },
  scrollContent: {
    padding: isSmallScreen ? 12 : 20,
  },
  overallScoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 16 : 24,
    marginBottom: isSmallScreen ? 16 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  overallScoreCardLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: isSmallScreen ? 8 : 12,
  },
  overallScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overallScoreLeft: {
    flex: 1,
    marginRight: isSmallScreen ? 8 : 12,
  },
  overallScoreTitle: {
    fontSize: isSmallScreen ? 18 : 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: isSmallScreen ? 8 : 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 4 : 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
  },
  statusBadgeText: {
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: '600',
    color: '#059669',
  },
  progressContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: isSmallScreen ? 22 : 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  progressLabel: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#64748B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: isSmallScreen ? 12 : 16,
  },
  testResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 14 : 20,
    marginBottom: isSmallScreen ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  testResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 10 : 12,
  },
  iconContainer: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 10 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 10 : 12,
  },
  testResultContent: {
    flex: 1,
    minWidth: 0,
  },
  testResultTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: isSmallScreen ? 6 : 8,
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
    marginLeft: isSmallScreen ? 8 : 12,
    flexShrink: 0,
  },
  testResultPercentage: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusIcon: {
    width: isSmallScreen ? 18 : 20,
    height: isSmallScreen ? 18 : 20,
    borderRadius: isSmallScreen ? 9 : 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testResultDescription: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#64748B',
    lineHeight: isSmallScreen ? 18 : 20,
  },
  recommendationsCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 16 : 20,
    marginTop: 8,
    marginBottom: isSmallScreen ? 12 : 16,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : 16,
  },
  infoIconContainer: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
    borderRadius: isSmallScreen ? 14 : 16,
    backgroundColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 10 : 12,
  },
  recommendationsTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  recommendationsList: {
    gap: isSmallScreen ? 10 : 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#14B8A6',
    marginRight: isSmallScreen ? 6 : 8,
    lineHeight: isSmallScreen ? 20 : 22,
  },
  recommendationText: {
    flex: 1,
    fontSize: isSmallScreen ? 12 : 14,
    color: '#0F172A',
    lineHeight: isSmallScreen ? 20 : 22,
  },
  disclaimer: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#64748B',
    lineHeight: isSmallScreen ? 16 : 18,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: isSmallScreen ? 12 : 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isSmallScreen ? 12 : 16,
    gap: 8,
  },
  loadingText: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#64748B',
  },
});
