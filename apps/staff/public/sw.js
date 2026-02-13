const CACHE_NAME = "aplan-staff-v1";

// 설치 시 기본 셸 캐싱
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "/checkin",
        "/offline",
      ])
    )
  );
  self.skipWaiting();
});

// 이전 캐시 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first 전략 (API 요청 제외)
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // API, 인증 요청은 캐시하지 않음
  if (
    request.url.includes("/api/") ||
    request.url.includes("supabase") ||
    request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 성공 시 캐시 업데이트
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() =>
        // 오프라인 시 캐시에서 응답
        caches.match(request).then((cached) => cached || caches.match("/offline"))
      )
  );
});
