console.log("### NEW COGNITIVE FILE LOADED ###");

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Brain, Zap, Search } from "lucide-react-native";

const { width } = Dimensions.get("window");

/* ================= CONFIG ================= */

// FLOW
type Stage = "intro" | "task1" | "task2" | "done";

// TASK 1 – QUICK CHOICE (processing speed)
const TASK1_MAX_RESPONSES = 8;
const TASK1_MAX_TIME = 15_000; // 15 seconds
const TASK1_SYMBOLS = ["▲", "●", "■"];

// TASK 2 – ODD ONE OUT (visual search)
const TASK2_MAX_ROUNDS = 6;
const TASK2_MAX_TIME = 12_000; // 12 seconds
const TASK2_BASE_GRID = ["●", "●", "●", "●", "▲"];

/* ================= COMPONENT ================= */

export default function CognitiveTest() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");

  /* -------- TASK 1 STATE -------- */
  const [t1Count, setT1Count] = useState(0);
  const [t1Symbol, setT1Symbol] = useState("▲");
  const t1StartRef = useRef<number>(0);
  const t1GlobalStart = useRef<number>(0);
  const [task1Data, setTask1Data] = useState<any[]>([]);

  /* -------- TASK 2 STATE -------- */
  const [t2Round, setT2Round] = useState(0);
  const [grid, setGrid] = useState<string[]>([]);
  const [target, setTarget] = useState("▲");
  const t2StartRef = useRef<number>(0);
  const t2GlobalStart = useRef<number>(0);
  const [task2Data, setTask2Data] = useState<any[]>([]);

  /* ================= HELPERS ================= */

  const randomSymbol = () =>
    TASK1_SYMBOLS[Math.floor(Math.random() * TASK1_SYMBOLS.length)];

  /* ================= TASK 1 ================= */

  const startTask1 = () => {
    setTask1Data([]);
    setT1Count(0);
    setT1Symbol(randomSymbol());
    t1StartRef.current = Date.now();
    t1GlobalStart.current = Date.now();
    setStage("task1");
  };

  const handleTask1Press = (choice: string) => {
    const now = Date.now();

    setTask1Data((d) => [
      ...d,
      {
        rt: now - t1StartRef.current,
        correct: choice === t1Symbol,
      },
    ]);

    const nextCount = t1Count + 1;
    setT1Count(nextCount);

    // STOP CONDITIONS
    if (
      nextCount >= TASK1_MAX_RESPONSES ||
      now - t1GlobalStart.current >= TASK1_MAX_TIME
    ) {
      startTask2();
      return;
    }

    setT1Symbol(randomSymbol());
    t1StartRef.current = now;
  };

  /* ================= TASK 2 ================= */

  const startTask2 = () => {
    setTask2Data([]);
    setT2Round(0);
    nextGrid();
    t2GlobalStart.current = Date.now();
    setStage("task2");
  };

  const nextGrid = () => {
    const shuffled = [...TASK2_BASE_GRID].sort(() => Math.random() - 0.5);
    setGrid(shuffled);
    setTarget("▲");
    t2StartRef.current = Date.now();
  };

  const handleGridPress = (symbol: string) => {
    const now = Date.now();

    setTask2Data((d) => [
      ...d,
      {
        rt: now - t2StartRef.current,
        correct: symbol === target,
      },
    ]);

    const nextRound = t2Round + 1;
    setT2Round(nextRound);

    if (
      nextRound >= TASK2_MAX_ROUNDS ||
      now - t2GlobalStart.current >= TASK2_MAX_TIME
    ) {
      setStage("done");
      return;
    }

    nextGrid();
  };

  /* ================= UI ================= */

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: "Cognitive Assessment",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: "700",
            color: "#0F172A",
          },
          headerTintColor: "#0F172A",
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* INTRO */}
        {stage === "intro" && (
          <View style={styles.introContainer}>
            <View style={styles.header}>
              <View style={styles.iconBadge}>
                <Brain size={24} color="#10B981" />
              </View>
              <Text style={styles.title}>Cognitive Test</Text>
              <Text style={styles.subtitle}>
                Two short tasks to assess your cognitive abilities
              </Text>
            </View>

            <View style={styles.taskPreview}>
              <View style={styles.taskPreviewItem}>
                <View style={[styles.taskIcon, { backgroundColor: "#ECFDF5" }]}>
                  <Zap size={20} color="#10B981" />
                </View>
                <Text style={styles.taskPreviewTitle}>Task 1: Quick Match</Text>
                <Text style={styles.taskPreviewDesc}>
                  Tap the matching shape as fast as you can
                </Text>
              </View>

              <View style={styles.taskPreviewItem}>
                <View style={[styles.taskIcon, { backgroundColor: "#F0F9FF" }]}>
                  <Search size={20} color="#0EA5E9" />
                </View>
                <Text style={styles.taskPreviewTitle}>Task 2: Find Different</Text>
                <Text style={styles.taskPreviewDesc}>
                  Find the symbol that's different from the rest
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={startTask1}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryText}>Start Assessment</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TASK 1 */}
        {stage === "task1" && (
          <View style={styles.taskContainer}>
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressDot,
                  styles.progressDotActive,
                ]}
              />
              <View style={styles.progressLine} />
              <View style={[styles.progressDot, styles.progressDotInactive]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconBadge, { backgroundColor: "#ECFDF5" }]}>
                <Zap size={20} color="#10B981" />
              </View>
              <Text style={styles.title}>Quick Match</Text>
              <Text style={styles.subtitle}>
                Tap the shape that matches the one shown
              </Text>
            </View>

            {/* Task Card */}
            <View style={styles.taskCard}>
              <View style={styles.symbolBox}>
                <Text style={styles.symbol}>{t1Symbol}</Text>
              </View>

              <View style={styles.row}>
                {TASK1_SYMBOLS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.choiceBtn}
                    onPress={() => handleTask1Press(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.choiceText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${((t1Count + 1) / TASK1_MAX_RESPONSES) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {t1Count + 1} of {TASK1_MAX_RESPONSES}
              </Text>
            </View>
          </View>
        )}

        {/* TASK 2 */}
        {stage === "task2" && (
          <View style={styles.taskContainer}>
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <View style={[styles.progressLine, styles.progressLineActive]} />
              <View
                style={[
                  styles.progressDot,
                  styles.progressDotActive,
                ]}
              />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconBadge, { backgroundColor: "#F0F9FF" }]}>
                <Search size={20} color="#0EA5E9" />
              </View>
              <Text style={styles.title}>Find Different</Text>
              <Text style={styles.subtitle}>
                Tap the symbol that's different from the others
              </Text>
            </View>

            {/* Task Card */}
            <View style={styles.taskCard}>
              <View style={styles.grid}>
                {grid.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.gridCell}
                    onPress={() => handleGridPress(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.gridText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${((t2Round + 1) / TASK2_MAX_ROUNDS) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {t2Round + 1} of {TASK2_MAX_ROUNDS}
              </Text>
            </View>
          </View>
        )}

        {/* DONE */}
        {stage === "done" && (
          <View style={styles.completedContainer}>
            <View style={styles.completedIcon}>
              <Brain size={48} color="#10B981" />
            </View>
            <Text style={styles.completedTitle}>Assessment Complete!</Text>
            <Text style={styles.completedSubtitle}>
              Thank you for completing the cognitive assessment.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryText}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scrollContent: {
    padding: 24,
    alignItems: "center",
  },

  /* INTRO STYLES */
  introContainer: {
    width: "100%",
    alignItems: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: 32,
  },

  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },

  taskPreview: {
    width: "100%",
    gap: 16,
    marginBottom: 32,
  },

  taskPreviewItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },

  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  taskPreviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },

  taskPreviewDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  primaryBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  /* TASK STYLES */
  taskContainer: {
    width: "100%",
    alignItems: "center",
  },

  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    width: "100%",
    justifyContent: "center",
  },

  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E2E8F0",
  },

  progressDotActive: {
    backgroundColor: "#10B981",
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  progressDotCompleted: {
    backgroundColor: "#10B981",
  },

  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },

  progressLineActive: {
    backgroundColor: "#10B981",
  },

  progressDotInactive: {
    backgroundColor: "#E2E8F0",
  },

  taskCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
  },

  symbolBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  symbol: {
    fontSize: 64,
  },

  row: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 24,
    justifyContent: "center",
  },

  choiceBtn: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  choiceText: {
    fontSize: 32,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
    width: "100%",
  },

  gridCell: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  gridText: {
    fontSize: 32,
  },

  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    marginBottom: 12,
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },

  progressText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },

  /* COMPLETED STYLES */
  completedContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 40,
  },

  completedIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  completedTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },

  completedSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
});
