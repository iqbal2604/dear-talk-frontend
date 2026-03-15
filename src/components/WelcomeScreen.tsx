export function WelcomeScreen() {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">
          <svg viewBox="0 0 96 96" width="96" height="96" fill="none">
            <circle cx="48" cy="48" r="48" fill="var(--accent)" opacity="0.1" />
            <path
              d="M48 16C30.33 16 16 30.33 16 48c0 5.56 1.5 10.77 4.13 15.25L16 80l17.1-4.46A31.82 31.82 0 0 0 48 80c17.67 0 32-14.33 32-32S65.67 16 48 16z"
              fill="var(--accent)"
              opacity="0.8"
            />
            <circle cx="37" cy="48" r="3" fill="#fff" />
            <circle cx="48" cy="48" r="3" fill="#fff" />
            <circle cx="59" cy="48" r="3" fill="#fff" />
          </svg>
        </div>
        <h2 className="welcome-title">DearTalk Web</h2>
        <p className="welcome-desc">
          Kirim dan terima pesan tanpa menyimpan ponsel Anda dalam kondisi online.<br />
          Gunakan DearTalk di mana saja dan kapan saja.
        </p>
        <div className="welcome-features">
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <span>Pesan terenkripsi end-to-end</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>Real-time dengan WebSocket</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">👥</span>
            <span>Chat privat & grup</span>
          </div>
        </div>
      </div>
    </div>
  );
}
