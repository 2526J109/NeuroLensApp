import React, { useState, useEffect, useMemo } from 'react';
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
  Activity,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssessment } from '@/contexts/AssessmentContext';
// No API import needed - results passed directly via route params

interface TestResult {
  id: string;
  title: string;
  percentage: number; // This is the model output (0-100), will be converted to risk score
  icon: React.ComponentType<any>;
  iconColor: string;
  backgroundColor: string;
  status: 'low' | 'medium' | 'high'; // Risk levels
  description: string;
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
const getRiskColor = (riskLevel: 'low' | 'medium' | 'high'): { icon: string; background: string } => {
  switch (riskLevel) {
    case 'low':
      return { icon: '#10B981', background: '#D1FAE5' }; // Green
    case 'medium':
      return { icon: '#F97316', background: '#FED7AA' }; // Orange
    case 'high':
      return { icon: '#EF4444', background: '#FEE2E2' }; // Red
  }
};

// Get risk description
const getRiskDescription = (title: string, riskScore: number, riskLevel: 'low' | 'medium' | 'high'): string => {
  switch (riskLevel) {
    case 'low':
      return `${title} shows low risk indicators. Results are within normal parameters.`;
    case 'medium':
      return `${title} shows moderate risk. Some abnormalities detected. Monitor regularly.`;
    case 'high':
      return `${title} shows elevated risk. Significant abnormalities detected. Consult healthcare provider.`;
  }
};

// Helper to create test result with proper risk-based styling
const createTestResult = (
  id: string,
  title: string,
  percentage: number, // Model output (0-100, where higher = healthier)
  icon: React.ComponentType<any>
): TestResult => {
  const riskScore = getRiskScore(percentage);
  const riskLevel = getRiskLevel(riskScore);
  const colors = getRiskColor(riskLevel);

  return {
    id,
    title,
    percentage,
    icon,
    iconColor: colors.icon,
    backgroundColor: colors.background,
    status: riskLevel,
    description: getRiskDescription(title, riskScore, riskLevel),
  };
};

// Default test results (fallback) - percentages are model outputs, will be converted to risk scores
const getInitialTestResults = (t: (key: string) => string): TestResult[] => [
  createTestResult('movement', t('resultsTab.tests.movement'), 75, Watch),
  createTestResult('voice', t('resultsTab.tests.voice'), 60, Mic),
  createTestResult('motor', t('resultsTab.tests.motor'), 78, PenTool),
  createTestResult('cognitive', t('resultsTab.tests.cognitive'), 85, Brain),
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;
const isTablet = SCREEN_WIDTH >= 768;

const CircularProgress = ({ riskScore, size, t }: { riskScore: number; size?: number; t: (key: string) => string }) => {
  const defaultSize = isSmallScreen ? 90 : isTablet ? 140 : 120;
  const progressSize = size || defaultSize;
  const strokeWidth = isSmallScreen ? 6 : isTablet ? 10 : 8;
  const radius = (progressSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (riskScore / 100) * circumference;

  // Get color based on risk level
  const riskLevel = getRiskLevel(riskScore);
  const colors = getRiskColor(riskLevel);
  const strokeColor = colors.icon;

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
        {/* Risk circle */}
        <Circle
          cx={progressSize / 2}
          cy={progressSize / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${progressSize / 2} ${progressSize / 2})`}
        />
      </Svg>
      <View style={[styles.progressContent, { width: progressSize, height: progressSize }]}>
        <Text style={styles.progressPercentage}>{riskScore}%</Text>
        <Text style={styles.progressLabel}>{t('results.riskScore').split(' ')[0]}</Text>
      </View>
    </View>
  );
};

const ProgressBar = ({ riskScore }: { riskScore: number }) => {
  // Determine risk level and get corresponding color
  const riskLevel = getRiskLevel(riskScore);
  const colors = getRiskColor(riskLevel);
  const barColor = colors.icon;

  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarFill, {
        width: `${riskScore}%`,
        backgroundColor: barColor,
      }]} />
    </View>
  );
};

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  const { isSessionComplete } = useAssessment();

  const defaultResults = useMemo(() => getInitialTestResults(t), [t]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  // Calculate initial overall risk score from default results
  const [overallScore, setOverallScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (testResults.length === 0) {
      setTestResults(defaultResults);
      const initialScore = Math.round(
        defaultResults.reduce((sum, r) => sum + getRiskScore(r.percentage), 0) / defaultResults.length
      );
      setOverallScore(initialScore);
    }
  }, [defaultResults]);

  useEffect(() => {
    // Get voice analysis result from route params (passed directly, no database)
    const voiceAnalysisResultParam = params.voiceAnalysisResult as string;
    if (voiceAnalysisResultParam) {
      try {
        const voiceResult = JSON.parse(voiceAnalysisResultParam);

        // Update voice analysis result
        const baseResults = testResults.length > 0 ? testResults : defaultResults;
        const updatedResults = [...baseResults];
        const voiceIndex = updatedResults.findIndex(r => r.id === 'voice');

        if (voiceIndex !== -1) {
          const modelPercentage = voiceResult.percentage || 0;
          const riskScore = getRiskScore(modelPercentage);
          const riskLevel = getRiskLevel(riskScore);
          const colors = getRiskColor(riskLevel);

          updatedResults[voiceIndex] = {
            ...updatedResults[voiceIndex],
            percentage: modelPercentage, // Store original model output
            status: riskLevel,
            description: t(`resultsTab.descriptions.${riskLevel}`).replace('%{title}', t('resultsTab.tests.voice')),
            iconColor: colors.icon,
            backgroundColor: colors.background,
          };
        }

        setTestResults(updatedResults);

        // Recalculate overall risk score (average of all test risk scores)
        const avgRiskScore = updatedResults.reduce((sum, r) => {
          const risk = getRiskScore(r.percentage);
          return sum + risk;
        }, 0) / updatedResults.length;
        setOverallScore(Math.round(avgRiskScore));
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
        <Text style={styles.headerTitle}>{t('resultsTab.combinedAssessment')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Risk Score Card */}
        <View style={styles.overallScoreCard}>
          <Text style={styles.overallScoreCardLabel}>{t('resultsTab.overallRiskScore')}</Text>
          <View style={styles.overallScoreHeader}>
            <View style={styles.overallScoreLeft}>
              <Text style={styles.overallScoreTitle}>{t('resultsTab.combinedAssessment')}</Text>
              <View style={[styles.statusBadge, {
                backgroundColor: getRiskColor(getRiskLevel(overallScore)).background,
                borderColor: getRiskColor(getRiskLevel(overallScore)).icon
              }]}>
                {getRiskLevel(overallScore) === 'low' ? (
                  <Check size={12} color={getRiskColor(getRiskLevel(overallScore)).icon} />
                ) : (
                  <AlertCircle size={12} color={getRiskColor(getRiskLevel(overallScore)).icon} />
                )}
                <Text style={[styles.statusBadgeText, {
                  color: getRiskColor(getRiskLevel(overallScore)).icon
                }]}>
                  {t(`resultsTab.riskLevel.${getRiskLevel(overallScore)}`)}
                </Text>
              </View>
            </View>
            <CircularProgress riskScore={overallScore} t={t} />
          </View>
        </View>

        {/* Test Results Section */}
        <Text style={styles.sectionTitle}>{t('resultsTab.testResults')}</Text>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#14B8A6" />
            <Text style={styles.loadingText}>{t('resultsTab.loadingVoice')}</Text>
          </View>
        )}

        {testResults.map((result) => {
          const IconComponent = result.icon;
          const riskScore = getRiskScore(result.percentage);
          const riskLevel = result.status;
          const colors = getRiskColor(riskLevel);

          return (
            <View key={result.id} style={styles.testResultCard}>
              <View style={styles.testResultHeader}>
                <View style={[styles.iconContainer, { backgroundColor: result.backgroundColor }]}>
                  <IconComponent size={24} color={result.iconColor} />
                </View>
                <View style={styles.testResultContent}>
                  <Text style={styles.testResultTitle}>{result.title}</Text>
                  <ProgressBar riskScore={riskScore} />
                </View>
                <View style={styles.testResultRight}>
                  <Text style={[styles.testResultPercentage, { color: result.iconColor }]}>
                    {riskScore}%
                  </Text>
                  {riskLevel === 'low' ? (
                    <View style={[styles.statusIcon, { backgroundColor: colors.icon }]}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  ) : riskLevel === 'medium' ? (
                    <View style={[styles.statusIcon, { backgroundColor: colors.icon }]}>
                      <AlertCircle size={12} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={[styles.statusIcon, { backgroundColor: colors.icon }]}>
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
            <Text style={styles.recommendationsTitle}>{t('resultsTab.recommendations.title')}</Text>
          </View>
          <View style={styles.recommendationsList}>
            {(t('resultsTab.recommendations.items') as unknown as string[]).map((item, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.recommendationText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          {t('resultsTab.disclaimerFull')}
        </Text>

        {/* View Multimodal Results Button */}
        {isSessionComplete && (
          <TouchableOpacity
            style={styles.multimodalButton}
            onPress={() => router.push('/multimodal-results' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.multimodalIconContainer}>
              <Activity size={24} color="#FFFFFF" />
            </View>
            <View style={styles.multimodalContent}>
              <Text style={styles.multimodalTitle}>{t('home.progress.viewFinalAnalysis')}</Text>
              <Text style={styles.multimodalSubtitle}>Weighted Clinical Assessment</Text>
            </View>
            <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
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
    borderRadius: isSmallScreen ? 12 : isTablet ? 20 : 16,
    padding: isSmallScreen ? 16 : isTablet ? 32 : 24,
    marginBottom: isSmallScreen ? 16 : isTablet ? 32 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    maxWidth: isTablet ? 800 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  overallScoreCardLabel: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: isSmallScreen ? 8 : isTablet ? 16 : 12,
  },
  overallScoreHeader: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    alignItems: isSmallScreen ? 'flex-start' : 'center',
    justifyContent: 'space-between',
    gap: isSmallScreen ? 16 : 0,
  },
  overallScoreLeft: {
    flex: 1,
    marginRight: isSmallScreen ? 0 : isTablet ? 20 : 12,
    width: isSmallScreen ? '100%' : 'auto',
  },
  overallScoreTitle: {
    fontSize: isSmallScreen ? 18 : isTablet ? 28 : 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: isSmallScreen ? 8 : isTablet ? 16 : 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: isSmallScreen ? 8 : isTablet ? 14 : 10,
    paddingVertical: isSmallScreen ? 4 : isTablet ? 8 : 6,
    borderRadius: isSmallScreen ? 14 : isTablet ? 20 : 16,
    alignSelf: 'flex-start',
    gap: isSmallScreen ? 4 : isTablet ? 6 : 4,
  },
  statusBadgeText: {
    fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12,
    fontWeight: '600',
    color: '#059669',
  },
  progressContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: isSmallScreen ? 20 : isTablet ? 36 : 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  progressLabel: {
    fontSize: isSmallScreen ? 9 : isTablet ? 14 : 12,
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
    borderRadius: isSmallScreen ? 12 : isTablet ? 20 : 16,
    padding: isSmallScreen ? 14 : isTablet ? 28 : 20,
    marginBottom: isSmallScreen ? 12 : isTablet ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    maxWidth: isTablet ? 800 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  testResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 10 : 12,
  },
  iconContainer: {
    width: isSmallScreen ? 40 : isTablet ? 64 : 48,
    height: isSmallScreen ? 40 : isTablet ? 64 : 48,
    borderRadius: isSmallScreen ? 10 : isTablet ? 16 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 10 : isTablet ? 16 : 12,
  },
  testResultContent: {
    flex: 1,
    minWidth: 0,
  },
  testResultTitle: {
    fontSize: isSmallScreen ? 14 : isTablet ? 20 : 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: isSmallScreen ? 6 : isTablet ? 12 : 8,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
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
    fontSize: isSmallScreen ? 16 : isTablet ? 24 : 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusIcon: {
    width: isSmallScreen ? 18 : isTablet ? 28 : 20,
    height: isSmallScreen ? 18 : isTablet ? 28 : 20,
    borderRadius: isSmallScreen ? 9 : isTablet ? 14 : 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testResultDescription: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#64748B',
    lineHeight: isSmallScreen ? 18 : isTablet ? 24 : 20,
  },
  recommendationsCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: isSmallScreen ? 12 : isTablet ? 20 : 16,
    padding: isSmallScreen ? 16 : isTablet ? 28 : 20,
    marginTop: 8,
    marginBottom: isSmallScreen ? 12 : isTablet ? 24 : 16,
    maxWidth: isTablet ? 800 : '100%',
    alignSelf: 'center',
    width: '100%',
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
    fontSize: isSmallScreen ? 16 : isTablet ? 22 : 18,
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
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#0F172A',
    lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
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
  multimodalButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  multimodalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  multimodalContent: {
    flex: 1,
  },
  multimodalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  multimodalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
