import React, { createContext, useContext } from "react";

import type { TabRootHref } from "@/lib/tabPath";

export { tabPath, type TabRootHref } from "@/lib/tabPath";

const TabRootContext = createContext<TabRootHref>("/(tabs)");

export function TabRootProvider({
  value,
  children,
}: {
  value: TabRootHref;
  children: React.ReactNode;
}) {
  return (
    <TabRootContext.Provider value={value}>{children}</TabRootContext.Provider>
  );
}

export function useTabRoot(): TabRootHref {
  return useContext(TabRootContext);
}
