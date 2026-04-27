"use client";

type CryptoItem = {
  label: string;
  addr: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: CryptoItem[];
  copiedAddr: string | null;
  onCopy: (addr: string) => void;
};

export default function DonationModal({
  open,
  onClose,
  items,
  copiedAddr,
  onCopy,
}: Props) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          maxWidth: 480,
          width: "100%",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Apoiar o projeto 💚</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "1.4rem",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "0.78rem", lineHeight: 1.6, color: "var(--text)", margin: 0 }}>
          Esta aplicação é completamente gratuita e não tem qualquer publicidade, é apenas
          carregada de boa vontade! Se queres ajudar-me a manter este projeto, tens algumas formas
          de como contribuir abaixo. Se queres contribuir de outra forma, por favor envia um email
          para{" "}
          <a href="mailto:zirgolina@sapo.pt" style={{ color: "var(--accent)" }}>
            zirgolina@tuta.io
          </a>
          .
        </p>

        {items.map(({ label, addr }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <p className="field-label" style={{ margin: 0 }}>
              {label}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                padding: "0.4rem 0.6rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.65rem",
                  fontFamily: "monospace",
                  color: "var(--text)",
                  flex: 1,
                  wordBreak: "break-all",
                }}
              >
                {addr}
              </span>

              <button
                onClick={() => onCopy(addr)}
                title="Copiar"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: copiedAddr === addr ? "var(--accent)" : "var(--text-muted)",
                  flexShrink: 0,
                  padding: "0.1rem",
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.2s",
                }}
              >
                {copiedAddr === addr ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}