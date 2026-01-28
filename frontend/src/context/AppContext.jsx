import { createContext, useState } from "react";

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [loading, setLoading] = useState(false);

  return (
    <AppContext.Provider value={{ loading, setLoading }}>
      {loading && <FullScreenLoader />}
      {children}
    </AppContext.Provider>
  );
}

function FullScreenLoader() {
  return (
    <div style={styles.overlay}>
      <div style={styles.spinner}></div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(255,255,255,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  spinner: {
    width: 48,
    height: 48,
    border: "5px solid #e5e7eb",
    borderTop: "5px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};
