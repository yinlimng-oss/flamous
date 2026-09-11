export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
      <div>
        <h1 style={{ fontFamily: "var(--admin-font-display)", fontSize: 28 }}>Feast Dining Group</h1>
        <p style={{ color: "var(--admin-ink-muted)", marginTop: 8 }}>
          This site is reached by scanning a table QR code. Visit{" "}
          <code>/r/&#123;restaurant-slug&#125;?outlet=&#123;outlet-code&#125;</code> to start a review.
        </p>
      </div>
    </main>
  );
}
