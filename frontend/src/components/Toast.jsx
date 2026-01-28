export default function Toast({ message, type = "error" }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        marginBottom: 12,
        background: type === "error" ? "#fee2e2" : "#dcfce7",
        color: "#111827",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}
