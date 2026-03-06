import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Brain, CheckCircle2, ChevronRight, Clock } from "lucide-react-native";

/* ─────────────────────────────────────────────
   SCREEN DIMENSIONS
   We read width/height once. All sizing derives
   from these so nothing ever overflows.
───────────────────────────────────────────── */
const SCREEN = Dimensions.get("window");
const W = SCREEN.width;
const H = SCREEN.height;

// Numpad sizing — module level so StyleSheet can reference them
const PAD = 16;
const GAP = 10;
const BTN = Math.min(90, Math.floor((W - PAD * 2 - GAP * 2) / 3));

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const C = {
  green:   "#10B981",
  greenDk: "#059669",
  greenLt: "#ECFDF5",
  bg:      "#F8FAFC",
  white:   "#FFFFFF",
  ink:     "#0F172A",
  mid:     "#334155",
  muted:   "#64748B",
  border:  "#E2E8F0",
  subtle:  "#F1F5F9",
  amber:   "#FEF3C7",
  amberTx: "#D97706",
};

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type Stage =
  | "intro" | "tmt_instr" | "tmt_practice" | "tmt_rest"
  | "tmt_real" | "break" | "sdmt_instr" | "sdmt_practice"
  | "sdmt_real" | "done";

interface TmtTap {
  dotNumber: number; correct: boolean; rt: number; timestamp: number;
}
interface SdmtTrial {
  trial: number; symbolIndex: number; response: number;
  correct: boolean; rt: number; timestamp: number;
}

/* ─────────────────────────────────────────────
   TMT CONFIG
   Dot positions as fractions of canvas size.
   Canvas size is measured via onLayout —
   positions are only computed after we know
   the actual rendered dimensions.
   Dots kept ≥ DOT_R from each edge so nothing clips.
───────────────────────────────────────────── */
const DOT_COUNT   = 25;
const PRACTICE_N  = 5;

// Raw fractional positions — applied to measured canvas
const RAW_25: { x: number; y: number }[] = [
  {x:0.13,y:0.08},{x:0.68,y:0.13},{x:0.38,y:0.06},
  {x:0.86,y:0.28},{x:0.20,y:0.24},{x:0.56,y:0.07},
  {x:0.07,y:0.45},{x:0.48,y:0.22},{x:0.79,y:0.48},
  {x:0.27,y:0.42},{x:0.62,y:0.36},{x:0.09,y:0.62},
  {x:0.43,y:0.56},{x:0.75,y:0.66},{x:0.21,y:0.72},
  {x:0.55,y:0.74},{x:0.87,y:0.82},{x:0.07,y:0.82},
  {x:0.39,y:0.80},{x:0.67,y:0.56},{x:0.33,y:0.62},
  {x:0.87,y:0.08},{x:0.53,y:0.46},{x:0.17,y:0.50},
  {x:0.73,y:0.82},
];

const RAW_5: { x: number; y: number }[] = [
  {x:0.20,y:0.20},{x:0.76,y:0.20},
  {x:0.76,y:0.72},{x:0.20,y:0.72},
  {x:0.48,y:0.46},
];

/* ─────────────────────────────────────────────
   SDMT CONFIG
───────────────────────────────────────────── */
const SYMBOLS = [
  {s:"▲",d:1},{s:"●",d:2},{s:"■",d:3},
  {s:"◆",d:4},{s:"★",d:5},{s:"⬟",d:6},
  {s:"⬤",d:7},{s:"▼",d:8},{s:"✦",d:9},
];
const SDMT_MS        = 60000;
const PAUSE_AT_MS    = 30000;
const PAUSE_DURATION = 3000;
const PRACTICE_N_SDMT = 5;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }

function buildQueue(): number[] {
  const base = [0,1,2,3,4,5,6,7,8];
  let q: number[] = [];
  while (q.length < 300) q = q.concat(shuffle(base));
  return q;
}

function sdmtFeatures(trials: SdmtTrial[]) {
  const ok   = trials.filter(t => t.correct);
  const rts  = ok.map(t => t.rt);
  const mean = rts.length ? rts.reduce((a,b)=>a+b,0)/rts.length : 0;
  const std  = rts.length>1
    ? Math.sqrt(rts.map(r=>(r-mean)**2).reduce((a,b)=>a+b,0)/rts.length) : 0;
  const n = rts.length;
  let slope = 0;
  if (n>3) {
    const xm=(n-1)/2, ym=mean;
    const num=rts.reduce((s,y,x)=>s+(x-xm)*(y-ym),0);
    const den=rts.reduce((s,_,x)=>s+(x-xm)**2,0);
    slope = den>0 ? num/den : 0;
  }
  return {
    sdmtTotal: ok.length, meanRT: mean,
    rtCV: mean>0?std/mean:0,
    errorRate: trials.length>0?(trials.length-ok.length)/trials.length:0,
    fatigueSlope: slope,
  };
}

function tmtFeatures(taps: TmtTap[]) {
  const ok  = taps.filter(t=>t.correct);
  const rts = ok.map(t=>t.rt).filter(r=>r>0);
  return {
    tmtA: ok.length===DOT_COUNT ? taps[taps.length-1].timestamp-taps[0].timestamp : null,
    meanInterTap: rts.length ? rts.reduce((a,b)=>a+b,0)/rts.length : 0,
    errors: taps.filter(t=>!t.correct).length,
    completedDots: ok.length,
  };
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function CognitiveAssessment() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");

  // TMT
  const [nextDot,    setNextDot]    = useState(1);
  const [tapped,     setTapped]     = useState<number[]>([]);
  const [wrongFlash, setWrongFlash] = useState<number|null>(null);
  const [practice,   setPractice]   = useState(false);
  const lastTapTime   = useRef(0);
  const realTaps      = useRef<TmtTap[]>([]);

  // Canvas measured size — set by onLayout
  const [cvW, setCvW] = useState(0);
  const [cvH, setCvH] = useState(0);

  // SDMT
  const [sdmtPhase,  setSdmtPhase]  = useState<"practice"|"real">("practice");
  const [symQueue,   setSymQueue]   = useState<number[]>([]);
  const [trialIdx,   setTrialIdx]   = useState(0);
  const [pracDone,   setPracDone]   = useState(0);
  const [feedback,   setFeedback]   = useState<"correct"|"wrong"|null>(null);
  const [timeLeft,   setTimeLeft]   = useState(SDMT_MS);
  const [paused,     setPaused]     = useState(false);
  const lastTrialT   = useRef(0);
  const realTrials   = useRef<SdmtTrial[]>([]);
  const pracTrials   = useRef<SdmtTrial[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval>|null>(null);

  // Fade animation
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade,{toValue:1,duration:220,useNativeDriver:true}).start();
  },[stage]);

  // SDMT timer
  const onReal = stage==="sdmt_real";
  useEffect(()=>{
    if(!onReal) return;
    if(timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(()=>{
      setTimeLeft(prev=>{
        const next = prev-100;
        if(prev>PAUSE_AT_MS && next<=PAUSE_AT_MS){
          setPaused(true);
          setTimeout(()=>setPaused(false), PAUSE_DURATION);
        }
        if(next<=0){
          clearInterval(timerRef.current!);
          timerRef.current=null;
          setStage("done");
          return 0;
        }
        return next;
      });
    },100);
    return ()=>{ if(timerRef.current){ clearInterval(timerRef.current); timerRef.current=null; }};
  },[onReal]);

  /* ── TMT ── */
  const startTmtPractice = useCallback(()=>{
    setNextDot(1); setTapped([]); setWrongFlash(null);
    setPractice(true); lastTapTime.current=Date.now();
    setStage("tmt_practice");
  },[]);

  const startTmtReal = useCallback(()=>{
    setNextDot(1); setTapped([]); setWrongFlash(null);
    setPractice(false); realTaps.current=[];
    lastTapTime.current=Date.now();
    setStage("tmt_real");
  },[]);

  const onDotTap = useCallback((n:number)=>{
    const now=Date.now(), rt=now-lastTapTime.current;
    if(n===nextDot){
      const newTapped=[...tapped,n];
      setTapped(newTapped);
      lastTapTime.current=now;
      if(!practice) realTaps.current.push({dotNumber:n,correct:true,rt,timestamp:now});
      const total=practice?PRACTICE_N:DOT_COUNT;
      if(n===total) setStage(practice?"tmt_rest":"break");
      else setNextDot(n+1);
    } else {
      setWrongFlash(n);
      setTimeout(()=>setWrongFlash(null),400);
      if(!practice) realTaps.current.push({dotNumber:n,correct:false,rt,timestamp:now});
    }
  },[nextDot,tapped,practice]);

  /* ── SDMT ── */
  const startSdmtPractice = useCallback(()=>{
    const q=buildQueue();
    setSymQueue(q); setTrialIdx(0); setPracDone(0); setFeedback(null);
    pracTrials.current=[];
    lastTrialT.current=Date.now();
    setStage("sdmt_practice");
  },[]);

  const startSdmtReal = useCallback(()=>{
    const q=buildQueue();
    setSymQueue(q); setTrialIdx(0);
    setTimeLeft(SDMT_MS); setPaused(false);
    realTrials.current=[];
    lastTrialT.current=Date.now();
    setStage("sdmt_real");
  },[]);

  const onSdmtPress = useCallback((digit:number)=>{
    if(paused) return;
    const now=Date.now(), rt=now-lastTrialT.current;
    const si=symQueue[trialIdx];
    const ok=digit===SYMBOLS[si].d;
    const trial:SdmtTrial={trial:trialIdx,symbolIndex:si,response:digit,correct:ok,rt,timestamp:now};

    if(sdmtPhase==="practice"){
      pracTrials.current.push(trial);
      setFeedback(ok?"correct":"wrong");
      const done=pracDone+1;
      setPracDone(done);
      if(done>=PRACTICE_N_SDMT){
        setSdmtPhase("real");
        setTimeout(()=>{ setFeedback(null); setStage("sdmt_instr"); },700);
        return;
      }
      setTimeout(()=>setFeedback(null),600);
    } else {
      realTrials.current.push(trial);
    }
    const ni=trialIdx+1;
    setTrialIdx(ni); setSymQueue(q=>{ /* keep same queue */ return q; });
    // use functional update so we always read latest queue
    lastTrialT.current=Date.now();
    // advance symbol
    setTrialIdx(ni);
  },[paused,symQueue,trialIdx,sdmtPhase,pracDone]);

  // Correct version of onSdmtPress — simpler, no duplicate setTrialIdx
  // (override above with the correct one)
  const handleSdmt = useCallback((digit:number)=>{
    if(paused) return;
    const now=Date.now(), rt=now-lastTrialT.current;
    const si=symQueue[trialIdx];
    if(si===undefined) return;
    const ok=digit===SYMBOLS[si].d;
    const trial:SdmtTrial={trial:trialIdx,symbolIndex:si,response:digit,correct:ok,rt,timestamp:now};

    if(sdmtPhase==="practice"){
      pracTrials.current.push(trial);
      setFeedback(ok?"correct":"wrong");
      const done=pracDone+1;
      setPracDone(done);
      if(done>=PRACTICE_N_SDMT){
        setSdmtPhase("real");
        setTimeout(()=>{ setFeedback(null); setStage("sdmt_instr"); },700);
        return;
      }
      setTimeout(()=>setFeedback(null),550);
    } else {
      realTrials.current.push(trial);
    }
    const ni=trialIdx+1;
    setTrialIdx(ni);
    lastTrialT.current=Date.now();
  },[paused,symQueue,trialIdx,sdmtPhase,pracDone]);

  const submit = useCallback(()=>{
    console.log("Cognitive payload:",{
      ...tmtFeatures(realTaps.current),
      ...sdmtFeatures(realTrials.current),
    });
  },[]);

  /* ─────────────────────────────────────────────
     DOT CANVAS
     Uses onLayout to get real rendered size.
     Dots positioned as % of that real size.
     DOT_R derived from canvas width so dots
     are always appropriately sized and spaced.
  ───────────────────────────────────────────── */
  const DOT_R = cvW>0 ? Math.max(18, Math.min(24, cvW*0.058)) : 22;

  const onCanvasLayout = useCallback((e:LayoutChangeEvent)=>{
    setCvW(e.nativeEvent.layout.width);
    setCvH(e.nativeEvent.layout.height);
  },[]);

  const DotCanvas = useCallback(({positions,total}:{positions:{x:number,y:number}[],total:number})=>{
    if(cvW===0||cvH===0) return null; // wait for layout
    return (
      <>
        {positions.map(({x,y},i)=>{
          const n=i+1;
          const cx=x*cvW - DOT_R; // centre offset
          const cy=y*cvH - DOT_R;
          const isDone = tapped.includes(n);
          const isNext = n===nextDot;
          const isWrong= n===wrongFlash;
          return (
            <TouchableOpacity
              key={n}
              onPress={()=>onDotTap(n)}
              hitSlop={{top:10,bottom:10,left:10,right:10}}
              activeOpacity={0.75}
              style={[
                styles.dot,
                {
                  left:   Math.max(0, Math.min(cx, cvW-DOT_R*2)),
                  top:    Math.max(0, Math.min(cy, cvH-DOT_R*2)),
                  width:  DOT_R*2, height: DOT_R*2,
                  borderRadius: DOT_R,
                  backgroundColor: isDone?C.green : isWrong?C.amber : isNext?C.greenLt : C.white,
                  borderColor:    isDone?C.greenDk: isWrong?C.amberTx: isNext?C.green  : C.border,
                  borderWidth: isNext?2.5:1.5,
                  elevation: isNext?6:2,
                  shadowColor: isNext?C.green:"#000",
                  shadowOpacity: isNext?0.3:0.06,
                  shadowRadius:  isNext?8:3,
                },
              ]}
            >
              <Text style={{
                fontSize: DOT_R*0.62,
                fontWeight:"800",
                color: isDone?C.white : isNext?C.greenDk : C.mid,
              }}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </>
    );
  },[cvW,cvH,tapped,nextDot,wrongFlash,onDotTap,DOT_R]);

  /* ─────────────────────────────────────────────
     SDMT KEY
     9 cells in a single row.
     Each cell width = (available width) / 9.
     We pass the measured container width in.
  ───────────────────────────────────────────── */
  const [keyW, setKeyW] = useState(0);
  const onKeyLayout = useCallback((e:LayoutChangeEvent)=>{
    setKeyW(e.nativeEvent.layout.width);
  },[]);
  const cellW = keyW>0 ? Math.floor(keyW/9) : 0;

  const SdmtKey = ()=>(
    <View style={styles.keyOuter} onLayout={onKeyLayout}>
      <Text style={styles.keyLabel}>KEY — match symbol to number</Text>
      <View style={styles.keyRow}>
        {SYMBOLS.map(({s,d})=>(
          <View key={d} style={[styles.keyCell,{width:cellW||undefined,flex:cellW?undefined:1}]}>
            <Text style={styles.keySym}>{s}</Text>
            <View style={styles.keyLine}/>
            <Text style={styles.keyDig}>{d}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  /* ─────────────────────────────────────────────
     NUMPAD
     3×3 grid. Button size = (screen width - 2×pad - 2×gap) / 3
     Fixed, predictable, always fits.
  ───────────────────────────────────────────── */
  const Numpad = ({onPress}:{onPress:(d:number)=>void})=>(
    <View style={styles.numpadGrid}>
      {[1,2,3,4,5,6,7,8,9].map(d=>(
        <TouchableOpacity
          key={d}
          onPress={()=>onPress(d)}
          activeOpacity={0.7}
          style={[styles.numpadBtn,{width:BTN,height:BTN}]}
        >
          <Text style={[styles.numpadTxt,{fontSize:BTN*0.36}]}>{d}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  /* ─────────────────────────────────────────────
     INFO SCREEN — shared layout for non-task screens
  ───────────────────────────────────────────── */
  const InfoScreen = ({children}:{children:React.ReactNode})=>(
    <View style={styles.infoScreen}>{children}</View>
  );

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{
        headerTitle:"Brain Health Check",
        headerShadowVisible:false,
        headerTintColor:C.green,
        headerTitleStyle:{color:C.ink,fontWeight:"700",fontSize:17},
        headerStyle:{backgroundColor:C.bg},
      }}/>

      <Animated.View style={[{flex:1},{opacity:fade}]}>

        {/* ── INTRO ── */}
        {stage==="intro" && (
          <InfoScreen>
            <View style={styles.iconCircle}><Brain size={34} color={C.green}/></View>
            <Text style={styles.title}>Brain Health Check</Text>
            <Text style={styles.sub}>Two short activities to check your thinking speed and attention.</Text>
            <View style={styles.listBox}>
              <View style={styles.listRow}>
                <View style={styles.badge}><Text style={styles.badgeTxt}>1</Text></View>
                <View>
                  <Text style={styles.listTitle}>Connect the Dots</Text>
                  <Text style={styles.listSub}>~2 minutes</Text>
                </View>
              </View>
              <View style={styles.divider}/>
              <View style={styles.listRow}>
                <View style={styles.badge}><Text style={styles.badgeTxt}>2</Text></View>
                <View>
                  <Text style={styles.listTitle}>Quick Match</Text>
                  <Text style={styles.listSub}>~1 minute</Text>
                </View>
              </View>
            </View>
            <Text style={styles.note}>A short practice round comes before each activity.</Text>
            <TouchableOpacity style={styles.btn} onPress={()=>setStage("tmt_instr")}>
              <Text style={styles.btnTxt}>Let's Begin</Text>
              <ChevronRight color={C.white} size={18}/>
            </TouchableOpacity>
          </InfoScreen>
        )}

        {/* ── TMT INSTRUCTION ── */}
        {stage==="tmt_instr" && (
          <InfoScreen>
            <Text style={styles.tag}>Activity 1 of 2</Text>
            <Text style={styles.title}>Connect the Dots</Text>
            <Text style={styles.sub}>Tap the dots in order — 1, then 2, then 3 — as quickly as you can.</Text>
            <View style={styles.exampleRow}>
              <View style={styles.exDot}><Text style={styles.exDotTxt}>3</Text></View>
              <Text style={styles.exLabel}>The dot you tap next glows green</Text>
            </View>
            <Text style={styles.note}>You'll practice with 5 dots first.</Text>
            <TouchableOpacity style={styles.btn} onPress={startTmtPractice}>
              <Text style={styles.btnTxt}>Start Practice</Text>
            </TouchableOpacity>
          </InfoScreen>
        )}

        {/* ── TMT PRACTICE ── */}
        {stage==="tmt_practice" && (
          <View style={styles.taskScreen}>
            <View style={styles.taskBar}>
              <Text style={styles.taskTag}>PRACTICE</Text>
              <Text style={styles.taskHint}>Tap <Text style={styles.taskHL}>{nextDot}</Text></Text>
            </View>
            <View style={styles.canvas} onLayout={onCanvasLayout}>
              <DotCanvas positions={RAW_5} total={PRACTICE_N}/>
            </View>
            <Text style={styles.hintBelow}>The glowing dot is where to tap next</Text>
            <View style={styles.progTrack}>
              <View style={[styles.progFill,{width:`${(tapped.length/PRACTICE_N)*100}%`}]}/>
            </View>
          </View>
        )}

        {/* ── TMT REST ── */}
        {stage==="tmt_rest" && (
          <InfoScreen>
            <View style={styles.iconCircle}><CheckCircle2 size={34} color={C.green}/></View>
            <Text style={styles.title}>Good job!</Text>
            <Text style={styles.sub}>Now the real activity — 25 dots. Tap them in order as quickly as you can.</Text>
            <Text style={styles.note}>Take a breath whenever you're ready.</Text>
            <TouchableOpacity style={styles.btn} onPress={startTmtReal}>
              <Text style={styles.btnTxt}>I'm Ready</Text>
            </TouchableOpacity>
          </InfoScreen>
        )}

        {/* ── TMT REAL ── */}
        {stage==="tmt_real" && (
          <View style={styles.taskScreen}>
            <View style={styles.taskBar}>
              <Text style={styles.taskTag}>CONNECT THE DOTS</Text>
              <Text style={styles.taskHint}>
                Tap <Text style={styles.taskHL}>{nextDot}</Text>
                <Text style={styles.taskTotal}> / {DOT_COUNT}</Text>
              </Text>
            </View>
            <View style={styles.canvas} onLayout={onCanvasLayout}>
              <DotCanvas positions={RAW_25} total={DOT_COUNT}/>
            </View>
            <View style={styles.progTrack}>
              <View style={[styles.progFill,{width:`${(tapped.length/DOT_COUNT)*100}%`}]}/>
            </View>
          </View>
        )}

        {/* ── BREAK ── */}
        {stage==="break" && (
          <InfoScreen>
            <View style={styles.iconCircle}><CheckCircle2 size={34} color={C.green}/></View>
            <Text style={styles.title}>Activity 1 Done!</Text>
            <Text style={styles.sub}>Well done. Take a moment to rest before the next activity.</Text>
            <View style={styles.upNext}>
              <Text style={styles.upLabel}>UP NEXT</Text>
              <Text style={styles.upName}>Quick Match  ·  ~1 min</Text>
            </View>
            <TouchableOpacity style={styles.btn} onPress={()=>setStage("sdmt_instr")}>
              <Text style={styles.btnTxt}>Continue When Ready</Text>
            </TouchableOpacity>
          </InfoScreen>
        )}

        {/* ── SDMT INSTRUCTION ── */}
        {stage==="sdmt_instr" && (
          <InfoScreen>
            <Text style={styles.tag}>
              {sdmtPhase==="practice" ? "Activity 2 of 2" : "Activity 2 — Starting Now"}
            </Text>
            <Text style={styles.title}>Quick Match</Text>
            <SdmtKey/>
            <Text style={styles.sub}>
              A symbol will appear. Tap the{" "}
              <Text style={styles.bold}>matching number</Text>{" "}
              from the key above.
            </Text>
            <Text style={styles.note}>
              {sdmtPhase==="practice"
                ? "5 practice rounds first — you'll see if you're right."
                : "60 seconds. Go as fast as you can. Mistakes are okay."}
            </Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={sdmtPhase==="practice" ? startSdmtPractice : startSdmtReal}
            >
              <Text style={styles.btnTxt}>
                {sdmtPhase==="practice" ? "Start Practice" : "Start Activity"}
              </Text>
            </TouchableOpacity>
          </InfoScreen>
        )}

        {/* ── SDMT PRACTICE ── */}
        {stage==="sdmt_practice" && (
          <View style={styles.sdmtScreen}>
            {/* TOP: header + key */}
            <View>
              <View style={styles.taskBar}>
                <Text style={styles.taskTag}>PRACTICE</Text>
                <Text style={styles.taskHint}>{PRACTICE_N_SDMT-pracDone} left</Text>
              </View>
              <SdmtKey/>
            </View>

            {/* MIDDLE: symbol */}
            <View style={styles.symArea}>
              <Text style={styles.symTxt}>
                {symQueue[trialIdx]!==undefined ? SYMBOLS[symQueue[trialIdx]].s : ""}
              </Text>
              {feedback && (
                <View style={[styles.fbBadge,{backgroundColor:feedback==="correct"?C.greenLt:C.amber}]}>
                  <Text style={[styles.fbTxt,{color:feedback==="correct"?C.greenDk:C.amberTx}]}>
                    {feedback==="correct" ? "✓  Correct" : "Not quite"}
                  </Text>
                </View>
              )}
            </View>

            {/* BOTTOM: numpad */}
            <Numpad onPress={handleSdmt}/>
          </View>
        )}

        {/* ── SDMT REAL ── */}
        {stage==="sdmt_real" && (
          <View style={styles.sdmtScreen}>
            {paused ? (
              <View style={styles.pauseScreen}>
                <Text style={styles.pauseTitle}>Take a breath</Text>
                <Text style={styles.pauseSub}>Continuing shortly…</Text>
              </View>
            ) : (
              <>
                {/* TOP */}
                <View>
                  <View style={styles.taskBar}>
                    <Text style={styles.taskTag}>QUICK MATCH</Text>
                    <View style={{flexDirection:"row",alignItems:"center",gap:4}}>
                      <Clock size={13} color={C.muted}/>
                      <Text style={styles.timerTxt}>{Math.ceil(timeLeft/1000)}s</Text>
                    </View>
                  </View>
                  <SdmtKey/>
                </View>

                {/* MIDDLE */}
                <View style={styles.symArea}>
                  <Text style={styles.symTxt}>
                    {symQueue[trialIdx]!==undefined ? SYMBOLS[symQueue[trialIdx]].s : ""}
                  </Text>
                </View>

                {/* BOTTOM */}
                <View>
                  <Numpad onPress={handleSdmt}/>
                  <View style={[styles.progTrack,{marginTop:12}]}>
                    <View style={[styles.progFill,{width:`${((SDMT_MS-timeLeft)/SDMT_MS)*100}%`}]}/>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── DONE ── */}
        {stage==="done" && (
          <InfoScreen>
            <View style={styles.iconCircle}><CheckCircle2 size={34} color={C.green}/></View>
            <Text style={styles.title}>All Done!</Text>
            <Text style={styles.sub}>Your brain health check is complete. Results have been recorded.</Text>
            <TouchableOpacity style={styles.btn} onPress={()=>{ submit(); router.back(); }}>
              <Text style={styles.btnTxt}>Return Home</Text>
            </TouchableOpacity>
          </InfoScreen>
        )}

      </Animated.View>
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────
   STYLES
   Rules:
   - No fixed heights on screen containers
   - All task screens use flex:1 + justifyContent
   - Font sizes capped with Math.min to never overflow
   - Padding/gaps from constants PAD/GAP
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:C.bg },

  // Info screens: centred column, evenly spaced
  infoScreen: {
    flex:1,
    paddingHorizontal:24,
    paddingTop:20,
    paddingBottom:28,
    justifyContent:"center",
    gap:14,
  },

  // Task screen (TMT): header + canvas(flex:1) + progress
  taskScreen: {
    flex:1,
    paddingHorizontal:16,
    paddingTop:12,
    paddingBottom:14,
  },

  // SDMT screen: header+key | symbol(flex:1) | numpad+progress
  sdmtScreen: {
    flex:1,
    paddingHorizontal:PAD,
    paddingTop:12,
    paddingBottom:16,
    flexDirection:"column",
  },

  // Dot canvas — fills all remaining vertical space
  canvas: {
    flex:1,
    backgroundColor:C.white,
    borderRadius:18,
    borderWidth:1,
    borderColor:C.border,
    marginBottom:10,
    overflow:"hidden",
  },
  dot: { position:"absolute", justifyContent:"center", alignItems:"center" },

  // Task bar (top strip with label + counter)
  taskBar: {
    flexDirection:"row", justifyContent:"space-between",
    alignItems:"center", marginBottom:10,
  },
  taskTag: { fontSize:11, fontWeight:"800", color:C.green, letterSpacing:1.4, textTransform:"uppercase" },
  taskHint: { fontSize:14, fontWeight:"600", color:C.muted },
  taskHL:   { color:C.green, fontWeight:"800" },
  taskTotal:{ color:"#CBD5E1", fontWeight:"600" },
  hintBelow:{ fontSize:12, color:"#CBD5E1", textAlign:"center", marginBottom:8, fontWeight:"500" },

  // Progress bar
  progTrack: { height:5, backgroundColor:C.border, borderRadius:3, overflow:"hidden" },
  progFill:  { height:"100%", backgroundColor:C.green, borderRadius:3 },

  // Info screen elements
  iconCircle: {
    width:68, height:68, borderRadius:34,
    backgroundColor:C.greenLt,
    justifyContent:"center", alignItems:"center",
    alignSelf:"center",
  },
  tag:   { color:C.green, fontWeight:"800", fontSize:12, letterSpacing:1, textTransform:"uppercase", textAlign:"center" },
  title: { fontSize:Math.min(26,W*0.068), fontWeight:"800", color:C.ink, textAlign:"center" },
  sub:   { fontSize:Math.min(15,W*0.040), color:C.muted, textAlign:"center", lineHeight:22 },
  bold:  { fontWeight:"700", color:C.mid },
  note:  { fontSize:13, color:"#94A3B8", textAlign:"center", lineHeight:19 },

  // Activity list on intro
  listBox:   { backgroundColor:C.white, borderRadius:18, padding:16, gap:0,
               shadowColor:"#000",shadowOpacity:0.04,shadowRadius:8,elevation:2 },
  listRow:   { flexDirection:"row", alignItems:"center", gap:12, paddingVertical:10 },
  divider:   { height:1, backgroundColor:C.border },
  badge:     { width:34,height:34,borderRadius:17,backgroundColor:C.greenLt,justifyContent:"center",alignItems:"center" },
  badgeTxt:  { color:C.green, fontWeight:"800", fontSize:15 },
  listTitle: { fontSize:15, fontWeight:"700", color:C.ink },
  listSub:   { fontSize:12, color:"#94A3B8", marginTop:2 },

  // Example dot on TMT instruction
  exampleRow:{ flexDirection:"row", alignItems:"center", backgroundColor:C.greenLt,
               borderRadius:14, padding:14, gap:12 },
  exDot:     { width:46,height:46,borderRadius:23,backgroundColor:C.greenLt,
               borderColor:C.green,borderWidth:2.5,justifyContent:"center",alignItems:"center",
               shadowColor:C.green,shadowOpacity:0.2,shadowRadius:6,elevation:4 },
  exDotTxt:  { fontSize:18, fontWeight:"800", color:C.greenDk },
  exLabel:   { flex:1, fontSize:14, color:C.mid, fontWeight:"500" },

  // Up next box
  upNext:    { backgroundColor:C.subtle, borderRadius:14, padding:14, alignItems:"center", gap:4 },
  upLabel:   { fontSize:10, fontWeight:"800", color:"#94A3B8", letterSpacing:1, textTransform:"uppercase" },
  upName:    { fontSize:15, fontWeight:"700", color:C.mid },

  // Primary button
  btn: {
    backgroundColor:C.green, paddingVertical:16, borderRadius:16,
    alignItems:"center", justifyContent:"center",
    flexDirection:"row", gap:6,
  },
  btnTxt: { color:C.white, fontSize:17, fontWeight:"700" },

  // SDMT Key — fits full width, all 9 cells visible
  keyOuter: {
    backgroundColor:C.subtle, borderRadius:14,
    paddingVertical:10, paddingHorizontal:4,
  },
  keyLabel: {
    fontSize:10, fontWeight:"700", color:"#94A3B8",
    textTransform:"uppercase", letterSpacing:0.8,
    textAlign:"center", marginBottom:8,
  },
  keyRow:  { flexDirection:"row", justifyContent:"space-between" },
  keyCell: { alignItems:"center" },
  keySym:  { fontSize:Math.min(15,W*0.038), fontWeight:"800", color:C.ink },
  keyLine: { height:1.5, width:"70%", backgroundColor:C.border, marginVertical:3 },
  keyDig:  { fontSize:Math.min(13,W*0.034), fontWeight:"800", color:C.green },

  // SDMT symbol display — explicit height so numpad never gets pushed off screen
  // Fixed numpad height = BTN(90)*3 + GAP(10)*2 = 290
  // Remaining = H - safeArea(106) - taskBar(34) - key(72) - numpad(290) - progress(17) - padding(28)
  symArea: {
    height: Math.max(70, H - 106 - 34 - 72 - 290 - 17 - 28),
    justifyContent:"center",
    alignItems:"center",
  },
  symTxt: { fontSize:Math.min(64, Math.max(70, H - 106 - 34 - 72 - 290 - 17 - 28) * 0.52), color:C.ink, fontWeight:"800" },
  fbBadge:{ position:"absolute", bottom:-4, paddingHorizontal:14, paddingVertical:5, borderRadius:20 },
  fbTxt:  { fontSize:14, fontWeight:"700" },

  // Numpad — 3×3 grid, always fits screen width
  numpadGrid: { flexDirection:"row", flexWrap:"wrap", gap:GAP, justifyContent:"center" },
  numpadBtn:  {
    backgroundColor:C.white, borderRadius:14,
    justifyContent:"center", alignItems:"center",
    borderWidth:1.5, borderColor:C.border,
    shadowColor:"#000", shadowOpacity:0.04, shadowRadius:4, elevation:2,
  },
  numpadTxt: { fontWeight:"800", color:C.ink },

  // Timer
  timerTxt: { fontSize:14, fontWeight:"700", color:"#94A3B8" },

  // Pause
  pauseScreen: { flex:1, justifyContent:"center", alignItems:"center", gap:10 },
  pauseTitle:  { fontSize:26, fontWeight:"800", color:C.ink, textAlign:"center" },
  pauseSub:    { fontSize:15, color:"#94A3B8", textAlign:"center" },
});