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
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowLeft,
} from 'lucide-react-native';

interface AssessmentEntry {
  id: string;
  date: string;
  overallScore: number;
  trend: 'up' | 'down' | 'stable';
  categories: {
    wearable: number;
    voice: number;
    drawing: number;
    brain: number;
  };
}

const ASSESSMENT_HISTORY: AssessmentEntry[] = [
  {
    id: '1',
    date: 'Dec 12, 2025',
    overallScore: 78,
    trend: 'up',
    categories: {
      wearable: 82,
      voice: 75,
      drawing: 80,
      brain: 76,
    },
  },
  {
    id: '2',
    date: 'Dec 5, 2025',
    overallScore: 75,
    trend: 'stable',
    categories: {
      wearable: 78,
      voice: 72,
      drawing: 77,
      brain: 73,
    },
  },
  {
    id: '3',
    date: 'Nov 28, 2025',
    overallScore: 74,
    trend: 'down',
    categories: {
      wearable: 76,
      voice: 70,
      drawing: 75,
      brain: 75,
    },
  },
  {
    id: '4',
    date: 'Nov 21, 2025',
    overallScore: 77,
    trend: 'up',
    categories: {
      wearable: 80,
      voice: 74,
      drawing: 78,
      brain: 76,
    },
  },
  {
    id: '5',
    date: 'Nov 14, 2025',
    overallScore: 72,
    trend: 'stable',
    categories: {
      wearable: 74,
      voice: 68,
      drawing: 73,
      brain: 73,
    },
  },
];

const TOTAL_ASSESSMENTS = 5;
const AVERAGE_SCORE = 75;

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  const iconSize = 16;
  const iconColor = trend === 'down' ? '#EF4444' : '#10B981';

  if (trend === 'up') {
    return <ArrowUp size={iconSize} color={iconColor} />;
  } else if (trend === 'down') {
    return <ArrowDown size={iconSize} color={iconColor} />;
  } else {
    return <Minus size={iconSize} color={iconColor} />;
  }
};

export default function HistoryScreen() {
  const router = useRouter();

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
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Assessments</Text>
            <Text style={styles.summaryValue}>{TOTAL_ASSESSMENTS}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Average Score</Text>
            <Text style={[styles.summaryValue, styles.summaryValueGreen]}>
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
                <Text style={styles.overallScoreText}>{entry.overallScore}%</Text>
              </View>
            </View>

            {/* Category Scores */}
            <View style={styles.categoriesContainer}>
              <View style={styles.categoryItem}>
                <Text style={styles.categoryLabel}>Wearable</Text>
                <Text style={styles.categoryScore}>{entry.categories.wearable}%</Text>
              </View>
              <View style={styles.categoryItem}>
                <Text style={styles.categoryLabel}>Voice</Text>
                <Text style={styles.categoryScore}>{entry.categories.voice}%</Text>
              </View>
              <View style={styles.categoryItem}>
                <Text style={styles.categoryLabel}>Drawing</Text>
                <Text style={styles.categoryScore}>{entry.categories.drawing}%</Text>
              </View>
              <View style={styles.categoryItem}>
                <Text style={styles.categoryLabel}>Brain</Text>
                <Text style={styles.categoryScore}>{entry.categories.brain}%</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    marginRight: 12,
  },
  headerPlaceholder: {
    width: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'flex-start',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 8,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  summaryValueGreen: {
    color: '#10B981',
  },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#A7F3D0',
  },
  assessmentCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overallScoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  categoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  categoryItem: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  categoryScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
});
