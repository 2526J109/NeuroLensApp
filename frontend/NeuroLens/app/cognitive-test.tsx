console.log("### NEW COGNITIVE FILE LOADED ###");

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Brain } from "lucide-react-native";

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
    <SafeAreaView style={styles.container}>
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

      {/* INTRO */}
      {stage === "intro" && (
        <View style={styles.center}>
          <View style={styles.iconCircle}>
            <Brain size={42} color="#10B981" />
          </View>
          <Text style={styles.title}>Cognitive Test</Text>
          <Text style={styles.subtitle}>
            Two short tasks · takes under 30 seconds
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={startTask1}>
            <Text style={styles.primaryText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TASK 1 */}
      {stage === "task1" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Tap the matching shape
          </Text>

          <View style={styles.symbolBox}>
            <Text style={styles.symbol}>{t1Symbol}</Text>
          </View>

          <View style={styles.row}>
            {TASK1_SYMBOLS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.choiceBtn}
                onPress={() => handleTask1Press(s)}
              >
                <Text style={styles.choiceText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.progress}>
            {t1Count + 1} / {TASK1_MAX_RESPONSES}
          </Text>
        </View>
      )}

      {/* TASK 2 */}
      {stage === "task2" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Find the different symbol
          </Text>

          <View style={styles.grid}>
            {grid.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.gridCell}
                onPress={() => handleGridPress(s)}
              >
                <Text style={styles.gridText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.progress}>
            {t2Round + 1} / {TASK2_MAX_ROUNDS}
          </Text>
        </View>
      )}

      {/* DONE */}
      {stage === "done" && (
        <View style={styles.center}>
          <Text style={styles.title}>Completed</Text>
          <Text style={styles.subtitle}>
            Thank you for completing the assessment.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryText}>Return</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },

  primaryBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 20,
  },

  symbolBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  symbol: {
    fontSize: 48,
  },

  row: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },

  choiceBtn: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  choiceText: {
    fontSize: 28,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 16,
  },

  gridCell: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  gridText: {
    fontSize: 28,
  },

  progress: {
    fontSize: 13,
    color: "#64748B",
  },
});
