/** AWS 런타임 식별자와 별도로 실제 Node·보안 관련 라이브러리 버전을 기록한다. */
export function logRuntimeVersions(): void {
  console.info(
    "[runtime]",
    JSON.stringify({
      node: process.version,
      brotli: process.versions.brotli,
      ares: process.versions.ares,
      openssl: process.versions.openssl,
    }),
  );
}
