import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Nav, NavCtx, Route } from "./src/nav";
import Coach from "./src/screens/Coach";
import Grades from "./src/screens/Grades";
import Home from "./src/screens/Home";
import HomeworkList, { HomeworkDetail } from "./src/screens/Homework";
import Login from "./src/screens/Login";
import Settings from "./src/screens/Settings";
import Study, { Absences, CourseDetail, Courses, ExamDetail, Gaps, Priorities, QuizScreen } from "./src/screens/Study";
import Timetable from "./src/screens/Timetable";
import { AppProvider, useApp } from "./src/store";
import { useTheme } from "./src/theme";

const TABS: { label: string; icon: keyof typeof Ionicons.glyphMap; C: React.ComponentType }[] = [
  { label: "Accueil", icon: "home", C: Home },
  { label: "EDT", icon: "calendar", C: Timetable },
  { label: "Devoirs", icon: "checkbox", C: HomeworkList },
  { label: "Notes", icon: "stats-chart", C: Grades },
  { label: "Réviser", icon: "sparkles", C: Study },
];

function renderRoute(r: Route) {
  switch (r.name) {
    case "settings": return <Settings />;
    case "coach": return <Coach initial={r.initial} />;
    case "exam": return <ExamDetail id={r.id} />;
    case "courses": return <Courses />;
    case "course": return <CourseDetail id={r.id} />;
    case "priorities": return <Priorities />;
    case "gaps": return <Gaps />;
    case "quiz": return <QuizScreen subject={r.subject} focus={r.focus} />;
    case "homework": return <HomeworkDetail id={r.id} />;
    case "absences": return <Absences />;
  }
}

function Main() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, loggedIn } = useApp();
  const [tab, setTab] = useState(0);
  const [stack, setStack] = useState<Route[]>([]);

  const nav: Nav = useMemo(() => ({
    push: (r) => setStack((s) => [...s, r]),
    pop: () => setStack((s) => s.slice(0, -1)),
    tab: (i) => { setStack([]); setTab(i); },
  }), []);

  const onBack = useCallback(() => {
    if (stack.length) { nav.pop(); return true; }
    if (tab !== 0) { setTab(0); return true; }
    return false;
  }, [stack.length, tab, nav]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => { if (!loggedIn) setStack([]); }, [loggedIn]);

  if (!ready)
    return <View style={{ flex: 1, backgroundColor: t.accent, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#fff" size="large" /></View>;

  if (!loggedIn) return <View style={{ flex: 1, paddingBottom: insets.bottom }}><Login /></View>;

  const Current = TABS[tab].C;
  const top = stack[stack.length - 1];

  return (
    <NavCtx.Provider value={nav}>
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
        <View style={{ flex: 1 }}>{top ? renderRoute(top) : <Current />}</View>
        {!top || top.name !== "coach" ? (
          <View style={{ flexDirection: "row", backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border, paddingBottom: insets.bottom + 4, paddingTop: 8 }}>
            {TABS.map((x, i) => {
              const on = i === tab && !top;
              return (
                <Pressable key={x.label} onPress={() => nav.tab(i)} style={{ flex: 1, alignItems: "center", gap: 2 }}>
                  <Ionicons name={(on ? x.icon : `${x.icon}-outline`) as any} size={22} color={on ? t.accent : t.sub} />
                  <Text style={{ fontSize: 11, color: on ? t.accent : t.sub, fontWeight: on ? "700" : "500" }}>{x.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : <View style={{ height: insets.bottom, backgroundColor: t.card }} />}
      </View>
    </NavCtx.Provider>
  );
}

export default function App() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style={t.dark ? "light" : "dark"} />
        <Main />
      </AppProvider>
    </SafeAreaProvider>
  );
}
