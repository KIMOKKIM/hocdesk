export function hasTursoEnv(): boolean {
  return Boolean(
    process.env.TURSO_DATABASE_URL?.trim() &&
      process.env.TURSO_AUTH_TOKEN?.trim(),
  );
}

export function requireTursoEnv(): void {
  if (!hasTursoEnv()) {
    console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN이 필요합니다.");
    process.exit(1);
  }
}

export function printTursoEnvStatus(): void {
  console.log(
    `TURSO_DATABASE_URL: ${process.env.TURSO_DATABASE_URL?.trim() ? "설정됨" : "없음"}`,
  );
  console.log(
    `TURSO_AUTH_TOKEN: ${process.env.TURSO_AUTH_TOKEN?.trim() ? "설정됨" : "없음"}`,
  );
  console.log(
    `DATABASE_PROVIDER: ${process.env.DATABASE_PROVIDER?.trim() || "(미설정 → Vercel은 turso)"}`,
  );
}
