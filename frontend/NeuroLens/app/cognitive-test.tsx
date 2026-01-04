import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import {
  Brain,
  Zap,
  ChevronRight,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

/* ================= TYPES & CONFIG ================= */

type Stage = "intro" | "instr1" | "task1" | "instr2" | "task2" | "done";

// Task 1: Digital Symbol-Digit Modalities Test (SDMT)
const SDMT_TRIALS_TOTAL = 12;
const SDMT_SYMBOL_MAP = [
  { symbol: "▲", value: 1 },
  { symbol: "●", value: 2 },
  { symbol: "■", value: 3 },
];

// Task 2: Sequence Manipulation (Letter-Number Sequencing Proxy)
const LNS_ROUNDS_TOTAL = 5;
const NUMBER_POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MEMORY_FLASH_TIME = 3500; // 3.5 Seconds for encoding

/* ================= COMPONENT ================= */

export default function CognitiveAssessment() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");

  /* -------- TASK STATE -------- */
  const [sdmtTrial, setSdmtTrial] = useState(0);
  const [sdmtTarget, setSdmtTarget] = useState(SDMT_SYMBOL_MAP[0]);

  const [lnsRound, setLnsRound] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [options, setOptions] = useState<number[][]>([]);
  const [isMemorizing, setIsMemorizing] = useState(false);

  /* -------- RAW DATA STORAGE (For Feature Extraction) -------- */
  const task1Results = useRef<any[]>([]);
  const task2Results = useRef<any[]>([]);
  const startTimeRef = useRef<number>(0);

  /* ================= LOGIC HELPERS ================= */

  const randomSdmtTarget = () =>
    SDMT_SYMBOL_MAP[Math.floor(Math.random() * SDMT_SYMBOL_MAP.length)];

  const generateSequence = (length: number) =>
    [...NUMBER_POOL].sort(() => Math.random() - 0.5).slice(0, length);

  /**
   * RESEARCH LOGIC:
   * Option A: Correct Numbers + Correct Sorted Order
   * Option B: Correct Numbers + WRONG Order (Tests Manipulation/Executive Function)
   * Option C: WRONG Numbers + Correct Sorted Order (Tests Storage/Memory)
   */
  const generateOptions = (seq: number[]) => {
    const correct = [...seq].sort((a, b) => a - b);

    // Distractor: Wrong Order
    let wrongOrder = [...seq];
    if (JSON.stringify(wrongOrder) === JSON.stringify(correct)) {
      if (wrongOrder.length >= 2)
        [wrongOrder[0], wrongOrder[1]] = [wrongOrder[1], wrongOrder[0]];
    }

    // Distractor: Wrong Numbers (Replace one item with a distractor)
    const pool = NUMBER_POOL.filter((n) => !seq.includes(n));
    let wrongNumbers = [...correct];
    wrongNumbers[Math.floor(Math.random() * wrongNumbers.length)] =
      pool[Math.floor(Math.random() * pool.length)];
    wrongNumbers.sort((a, b) => a - b);

    return [correct, wrongOrder, wrongNumbers].sort(() => Math.random() - 0.5);
  };

  /* ================= TASK HANDLERS ================= */

  const startTask1 = () => {
    setSdmtTrial(1);
    setSdmtTarget(randomSdmtTarget());
    startTimeRef.current = Date.now();
    setStage("task1");
  };

  const handleSdmtPress = (value: number) => {
    const reactionTime = Date.now() - startTimeRef.current;
    const isCorrect = value === sdmtTarget.value;

    task1Results.current.push({ rt: reactionTime, correct: isCorrect });

    if (sdmtTrial >= SDMT_TRIALS_TOTAL) {
      setStage("instr2");
      return;
    }

    setSdmtTrial((t) => t + 1);
    setSdmtTarget(randomSdmtTarget());
    startTimeRef.current = Date.now();
  };

  const startTask2 = () => {
    setLnsRound(1);
    triggerNewMemoryRound(1);
    setStage("task2");
  };

  const triggerNewMemoryRound = (round: number) => {
    const len = Math.min(2 + Math.floor(round / 2), 4);
    const seq = generateSequence(len);

    setSequence(seq);
    setOptions(generateOptions(seq));

    setIsMemorizing(true);
    setTimeout(() => {
      setIsMemorizing(false);
      startTimeRef.current = Date.now(); // Start timing when options appear
    }, MEMORY_FLASH_TIME);
  };

  const handleLnsSelect = (choice: number[]) => {
    if (isMemorizing) return;

    const reactionTime = Date.now() - startTimeRef.current;
    const correctOrder = [...sequence].sort((a, b) => a - b);
    const isCorrect = JSON.stringify(choice) === JSON.stringify(correctOrder);

    task2Results.current.push({
      rt: reactionTime,
      correct: isCorrect,
      span: sequence.length,
    });

    if (lnsRound >= LNS_ROUNDS_TOTAL) {
      setStage("done");
    } else {
      const nextRound = lnsRound + 1;
      setLnsRound(nextRound);
      triggerNewMemoryRound(nextRound);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Assessment",
          headerShadowVisible: false,
          headerTintColor: "#10B981",
          headerTitleStyle: { color: "#1E293B", fontWeight: "700" },
          headerStyle: { backgroundColor: "#F8FAFC" },
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {stage === "intro" && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Brain size={40} color="#10B981" />
            </View>
            <Text style={styles.mainTitle}>Cognitive Health</Text>
            <Text style={styles.description}>
              We will check your mental processing speed and working memory.
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>• Task 1: Pattern Matching</Text>
              <Text style={styles.infoText}>• Task 2: Logical Sequencing</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setStage("instr1")}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
              <ChevronRight color="#FFF" size={20} />
            </TouchableOpacity>
          </View>
        )}

        {stage === "instr1" && (
          <View style={styles.card}>
            <Text style={styles.stepTag}>Step 1</Text>
            <Text style={styles.cardTitle}>Quick Match</Text>
            <Text style={styles.description}>
              Look at the key at the top. Match the center symbol to its number
              as fast as you can.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={startTask1}>
              <Text style={styles.primaryBtnText}>Start Activity</Text>
            </TouchableOpacity>
          </View>
        )}

        {stage === "task1" && (
          <View style={styles.taskFrame}>
            <View style={styles.keyContainer}>
              {SDMT_SYMBOL_MAP.map((m) => (
                <View key={m.value} style={styles.keyItem}>
                  <Text style={styles.keySymbol}>{m.symbol}</Text>
                  <View style={styles.keyDivider} />
                  <Text style={styles.keyValue}>{m.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.targetCard}>
              <Text style={styles.targetSymbol}>{sdmtTarget.symbol}</Text>
            </View>

            <View style={styles.buttonGrid}>
              {SDMT_SYMBOL_MAP.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={styles.numpadBtn}
                  onPress={() => handleSdmtPress(m.value)}
                >
                  <Text style={styles.numpadText}>{m.value}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.progressLabel}>
                Progress: {sdmtTrial} / {SDMT_TRIALS_TOTAL}
              </Text>
            </View>
          </View>
        )}

        {stage === "instr2" && (
          <View style={styles.card}>
            <Text style={styles.stepTag}>Step 2</Text>
            <Text style={styles.cardTitle}>Sequence Memory</Text>
            <Text style={styles.description}>
              A sequence will flash. Remember the numbers, then pick the option
              that shows them
              <Text style={{ fontWeight: "600", color: "#475569" }}>
                {" "}
                Sorted (Smallest to Largest)
              </Text>
              .
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={startTask2}>
              <Text style={styles.primaryBtnText}>Start Activity</Text>
            </TouchableOpacity>
          </View>
        )}

        {stage === "task2" && (
          <View style={styles.taskFrame}>
            <View style={styles.badge}>
              {isMemorizing ? (
                <Eye size={14} color="#10B981" />
              ) : (
                <EyeOff size={14} color="#94A3B8" />
              )}
              <Text
                style={[
                  styles.badgeText,
                  !isMemorizing && { color: "#94A3B8" },
                ]}
              >
                {isMemorizing ? "MEMORIZE NOW" : "RECALL ORDER"}
              </Text>
            </View>

            <View style={styles.sequenceRow}>
              {sequence.map((n, i) => (
                <View
                  key={i}
                  style={[
                    styles.memCard,
                    !isMemorizing && styles.memCardHidden,
                  ]}
                >
                  <Text
                    style={[styles.memText, !isMemorizing && { opacity: 0 }]}
                  >
                    {n}
                  </Text>
                  {!isMemorizing && <Text style={styles.hiddenMark}>?</Text>}
                </View>
              ))}
            </View>

            <Text style={styles.label}>
              {isMemorizing
                ? "Keep the numbers in mind..."
                : "Select the correct sorted order:"}
            </Text>

            {!isMemorizing ? (
              <View style={styles.optionContainer}>
                {options.map((opt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.optionCard}
                    onPress={() => handleLnsSelect(opt)}
                  >
                    <View style={styles.optPillRow}>
                      {opt.map((val, idx) => (
                        <React.Fragment key={idx}>
                          <Text style={styles.optValText}>{val}</Text>
                          {idx < opt.length - 1 && (
                            <ChevronRight size={14} color="#CBD5E1" />
                          )}
                        </React.Fragment>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View
                style={[styles.optionContainer, { opacity: 0 }]}
                pointerEvents="none"
              >
                <View style={styles.optionCard}>
                  <Text> </Text>
                </View>
                <View style={styles.optionCard}>
                  <Text> </Text>
                </View>
                <View style={styles.optionCard}>
                  <Text> </Text>
                </View>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.progressLabel}>
                Round {lnsRound} of {LNS_ROUNDS_TOTAL}
              </Text>
            </View>
          </View>
        )}

        {stage === "done" && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <CheckCircle2 size={40} color="#10B981" />
            </View>
            <Text style={styles.mainTitle}>Success</Text>
            <Text style={styles.description}>
              Your cognitive assessment is complete. Results have been recorded.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.primaryBtnText}>Return Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexGrow: 1,
    justifyContent: "center",
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    padding: 30,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  taskFrame: { width: "100%", alignItems: "center" },

  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginVertical: 15,
  },
  stepTag: {
    color: "#10B981",
    fontWeight: "800",
    fontSize: 13,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    marginBottom: 15,
    textAlign: "center",
  },

  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
    marginTop: 10,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#10B981",
    marginLeft: 8,
  },

  keyContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 15,
    marginBottom: 25,
    width: "100%",
    justifyContent: "space-evenly",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  keyItem: { alignItems: "center" },
  keySymbol: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
  keyDivider: {
    height: 2,
    width: 15,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },
  keyValue: { fontSize: 18, fontWeight: "800", color: "#10B981" },
  targetCard: {
    width: 140,
    height: 140,
    backgroundColor: "#FFF",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    elevation: 12,
    shadowColor: "#10B981",
    shadowOpacity: 0.15,
    shadowRadius: 15,
  },
  targetSymbol: { fontSize: 75, color: "#1E293B" },
  buttonGrid: { flexDirection: "row", gap: 18 },
  numpadBtn: {
    width: 85,
    height: 85,
    backgroundColor: "#FFF",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 4,
  },
  numpadText: { fontSize: 32, fontWeight: "800", color: "#1E293B" },

  sequenceRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    gap: 12,
    marginBottom: 25,
  },
  memCard: {
    backgroundColor: "#FFF",
    flex: 1,
    maxWidth: 75,
    aspectRatio: 0.8,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#10B981",
    elevation: 3,
  },
  memCardHidden: { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
  memText: { color: "#1E293B", fontSize: 30, fontWeight: "800" },
  hiddenMark: {
    position: "absolute",
    fontSize: 28,
    color: "#94A3B8",
    fontWeight: "800",
  },

  optionContainer: { width: "100%", gap: 14 },
  optionCard: {
    backgroundColor: "#FFF",
    paddingVertical: 20,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    elevation: 1,
  },
  optPillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  optValText: { fontSize: 20, fontWeight: "800", color: "#1E293B" },

  iconCircle: {
    width: 85,
    height: 85,
    borderRadius: 42,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: "#F8FAFC",
    padding: 18,
    borderRadius: 18,
    width: "100%",
    marginTop: 5,
  },
  infoText: {
    fontSize: 14,
    color: "#64748B",
    marginVertical: 3,
    fontWeight: "500",
  },
  footer: { marginTop: 40 },
  progressLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#CBD5E1",
    letterSpacing: 1.5,
  },
});
