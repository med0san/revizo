import React, { createContext, useContext } from "react";

export type Route =
  | { name: "settings" }
  | { name: "coach"; initial?: string }
  | { name: "exam"; id: string }
  | { name: "courses" }
  | { name: "course"; id: string }
  | { name: "priorities" }
  | { name: "gaps" }
  | { name: "quiz"; subject: string; focus: string }
  | { name: "homework"; id: string }
  | { name: "absences" };

export type Nav = { push: (r: Route) => void; pop: () => void; tab: (i: number) => void };
export const NavCtx = createContext<Nav>(null as any);
export const useNav = () => useContext(NavCtx);
