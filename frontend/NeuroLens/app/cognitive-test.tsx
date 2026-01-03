import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ==========================================
// CONFIGURATION
// ==========================================
const { width } = Dimensions.get("window");
const CELL_SIZE = (width - 60) / 3;

type GameState = "intro" | "memorize" | "recall" | "result";

export default function CognitiveTestScreen() {
  const router = useRouter();

  // STATE
  const [gameState, setGameState] = useState<GameState>("intro");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [highlightedCell, setHighlightedCell] = useState<number | null>(null);

  const sequenceLength = level + 2;
  // Maximum levels before the game stops
  const MAX_LEVEL = 5;
  const [finished, setFinished] = useState(false);

  // LOGIC: Generate random sequence (1-9)
  const generateSequence = (length: number): number[] => {
    return Array.from({ length }, () => Math.floor(Math.random() * 9) + 1);
  };

  // TIMER LOGIC
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === "memorize" && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (gameState === "memorize" && timeLeft === 0) {
      setGameState("recall");
    }
    return () => clearTimeout(timer);
  }, [gameState, timeLeft]);

  // SEQUENCE PLAYBACK LOGIC
  useEffect(() => {
    if (gameState === "memorize") {
      let index = 0;
      const interval = setInterval(() => {
        if (index < sequence.length) {
          setHighlightedCell(sequence[index]);
          setTimeout(() => setHighlightedCell(null), 400); // Highlight duration
          index++;
        } else {
          clearInterval(interval);
        }
      }, 800); // Speed of sequence
      return () => clearInterval(interval);
    }
  }, [gameState, sequence]);

  // HANDLERS
  const startGame = () => {
    if (finished) return;

    const newSequence = generateSequence(sequenceLength);
    setSequence(newSequence);
    setUserInput([]);
    setTimeLeft(sequenceLength + 2);
    setGameState("memorize");
  };

  const handleCellTap = (num: number) => {
    if (gameState !== "recall") return;

    const newInput = [...userInput, num];
    setUserInput(newInput);

    // Check if wrong immediately
    const currentIndex = newInput.length - 1;
    if (newInput[currentIndex] !== sequence[currentIndex]) {
      setGameState("result"); // Game Over
      return;
    }

    // Check if level complete
    if (newInput.length === sequence.length) {
      setScore((prev) => prev + level * 10);
      const nextLevel = level + 1;
      if (nextLevel > MAX_LEVEL) {
        setFinished(true);
      } else {
        setLevel(nextLevel);
      }
      setTimeout(() => setGameState("result"), 500);
    }
  };

  const resetGame = () => {
    setLevel(1);
    setScore(0);
    setGameState("intro");
    setFinished(false);
  };

  // UI RENDER
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cognitive Test</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* STATS BAR */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="brain" size={20} color="#4CAF50" />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.label}>Level</Text>
              <Text style={styles.value}>{level}</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="trophy" size={20} color="#FFC107" />
            <Text style={[styles.value, { marginLeft: 8 }]}>{score}</Text>
          </View>
        </View>

        {/* INTRO SCREEN */}
        {gameState === "intro" && (
          <View style={styles.centerContainer}>
            <View style={[styles.circleIcon, { backgroundColor: "#2196F3" }]}>
              <Ionicons name="brain" size={50} color="#fff" />
            </View>
            <Text style={styles.title}>Memory Challenge</Text>
            <Text style={styles.subtitle}>
              Memorize the highlighted numbers.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={startGame}>
              <Text style={styles.btnText}>Start Game</Text>
            </TouchableOpacity>

            <View style={styles.instructions}>
              <Text style={styles.instTitle}>How to Play</Text>
              <Text style={styles.instText}>• Watch the pattern</Text>
              <Text style={styles.instText}>• Repeat the sequence</Text>
            </View>
          </View>
        )}

        {/* GAME SCREEN */}
        {(gameState === "memorize" || gameState === "recall") && (
          <View style={styles.gameContainer}>
            <Text style={styles.statusText}>
              {gameState === "memorize"
                ? `Memorize! (${timeLeft}s)`
                : "Your Turn"}
            </Text>

            <View style={styles.grid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const isHigh = highlightedCell === num;
                const isSel = userInput.includes(num);
                return (
                  <TouchableOpacity
                    key={num}
                    activeOpacity={0.6}
                    disabled={gameState !== "recall"}
                    onPress={() => handleCellTap(num)}
                    style={[
                      styles.cell,
                      isHigh && styles.cellHigh,
                      isSel && styles.cellSel,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        (isHigh || isSel) && { color: "#fff" },
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* RESULT SCREEN */}
        {gameState === "result" && (
          <View style={styles.centerContainer}>
            {userInput.length === sequence.length || finished ? (
              <>
                <View
                  style={[styles.circleIcon, { backgroundColor: "#4CAF50" }]}
                >
                  <Ionicons name="trophy" size={50} color="#fff" />
                </View>
                <Text style={styles.title}>
                  {finished ? "All Levels Complete!" : "Level Complete!"}
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={resetGame}
                  >
                    <Text style={styles.secBtnText}>
                      {finished ? "Restart" : "Exit"}
                    </Text>
                  </TouchableOpacity>
                  {!finished && (
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={startGame}
                    >
                      <Text style={styles.btnText}>Next Level</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <>
                <View
                  style={[styles.circleIcon, { backgroundColor: "#F44336" }]}
                >
                  <Ionicons name="close" size={50} color="#fff" />
                </View>
                <Text style={styles.title}>Game Over</Text>
                <Text style={styles.subtitle}>
                  Sequence: {sequence.join(" - ")}
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={resetGame}
                  >
                    <Text style={styles.secBtnText}>Exit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={startGame}
                  >
                    <Text style={styles.btnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
  },
  backButton: { padding: 8 },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 16,
  },
  scrollContent: { padding: 20, paddingBottom: 50 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  statBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 10,
    borderRadius: 12,
  },
  label: { color: "#888", fontSize: 10, textTransform: "uppercase" },
  value: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  centerContainer: { alignItems: "center", marginTop: 40 },
  circleIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#aaa", marginBottom: 30 },
  primaryButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#666",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  secBtnText: { color: "#ccc", fontSize: 18, fontWeight: "bold" },
  instructions: {
    marginTop: 40,
    backgroundColor: "#1E1E1E",
    padding: 20,
    borderRadius: 16,
    width: "100%",
  },
  instTitle: { color: "#fff", fontWeight: "bold", marginBottom: 10 },
  instText: { color: "#aaa", marginBottom: 5 },
  gameContainer: { alignItems: "center" },
  statusText: {
    color: "#4CAF50",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: width - 40,
    justifyContent: "center",
    gap: 10,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cellHigh: { backgroundColor: "#4CAF50", transform: [{ scale: 1.05 }] },
  cellSel: {
    backgroundColor: "#2196F3",
    borderWidth: 2,
    borderColor: "#64B5F6",
  },
  cellText: { fontSize: 32, fontWeight: "bold", color: "#fff" },
});
