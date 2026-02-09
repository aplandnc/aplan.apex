// apps/admin/hooks/useNaverMaps.ts
import { useEffect, useState } from "react";

declare global {
  interface Window {
    __naverMapsPromise?: Promise<void>;
    __naverMapsLoaded?: boolean;
  }
}

type UseNaverMapsResult = {
  loaded: boolean;
  error: boolean;
};

export function useNaverMaps(): UseNaverMapsResult {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ✅ 이미 로드됐으면 즉시 true
    if (window.__naverMapsLoaded || (window as any).naver?.maps) {
      window.__naverMapsLoaded = true;
      setLoaded(true);
      return;
    }

    // ✅ env 변수명 여러개 대응 (현실적으로 이게 안전함)
    const keyId =
      process.env.NEXT_PUBLIC_NAVER_NCP_KEY_ID ||
      process.env.NEXT_PUBLIC_NAVER_MAP_KEY_ID ||
      process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

    // 디버깅용 로그
    console.log("[NAVER MAP DEBUG]", {
      NCP_KEY_ID: process.env.NEXT_PUBLIC_NAVER_NCP_KEY_ID,
      MAP_KEY_ID: process.env.NEXT_PUBLIC_NAVER_MAP_KEY_ID,
      CLIENT_ID: process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID,
      finalKeyId: keyId,
    });

    if (!keyId) {
      console.error(
        "[NAVER MAP] 키 없음. 아래 중 하나를 .env.local에 넣어야 함:\n" +
          "- NEXT_PUBLIC_NAVER_NCP_KEY_ID\n" +
          "- NEXT_PUBLIC_NAVER_MAP_KEY_ID\n" +
          "- NEXT_PUBLIC_NAVER_MAP_CLIENT_ID"
      );
      setError(true);
      return;
    }

    // ✅ 이미 로딩 중이면 그 Promise에 붙기만 함 (중복 로드 방지)
    if (window.__naverMapsPromise) {
      window.__naverMapsPromise
        .then(() => setLoaded(true))
        .catch(() => setError(true));
      return;
    }

    window.__naverMapsPromise = new Promise<void>((resolve, reject) => {
      try {
        // ✅ 절대 기존 스크립트/전역객체 삭제하지 말 것 (인증/콜백 깨짐 방지)
        const existing = document.querySelector<HTMLScriptElement>(
          'script[data-naver-map="true"], script[src*="oapi.map.naver.com/openapi/v3/maps.js"]'
        );

        // 이미 스크립트가 있으면, 로딩 완료만 기다린다
        if (existing) {
          const check = () => {
            if ((window as any).naver?.maps) {
              window.__naverMapsLoaded = true;
              resolve();
              return true;
            }
            return false;
          };

          if (check()) return;

          // 기존 스크립트가 아직 로딩 중일 수 있으니 이벤트만 붙임
          existing.addEventListener("load", () => {
            if ((window as any).naver?.maps) {
              window.__naverMapsLoaded = true;
              resolve();
            } else {
              reject(new Error("NAVER maps loaded but window.naver.maps is missing"));
            }
          });

          existing.addEventListener("error", () => {
            reject(new Error("NAVER maps script load error (existing script)"));
          });

          // 혹시 load 이벤트를 놓쳤을 수도 있으니 짧게 폴링(최대 2초)
          let tries = 0;
          const t = window.setInterval(() => {
            tries += 1;
            if (check()) {
              window.clearInterval(t);
            } else if (tries >= 20) {
              window.clearInterval(t);
              reject(new Error("NAVER maps load timeout (existing script)"));
            }
          }, 100);

          return;
        }

        const script = document.createElement("script");
        script.async = true;
        script.setAttribute("data-naver-map", "true");

        // ✅ 공식문서 방식 ncpKeyId
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
          keyId
        )}&submodules=geocoder`;

        script.onload = () => {
          console.log("[NAVER MAP DEBUG] script onload triggered");
          console.log("[NAVER MAP DEBUG] window.naver:", (window as any).naver);
          console.log("[NAVER MAP DEBUG] window.naver.maps:", (window as any).naver?.maps);

          if ((window as any).naver?.maps) {
            window.__naverMapsLoaded = true;
            resolve();
          } else {
            reject(new Error("NAVER maps loaded but window.naver.maps is missing"));
          }
        };

        script.onerror = (e) => {
          console.error("[NAVER MAP DEBUG] script onerror:", e);
          reject(new Error("NAVER maps script load error"));
        };

        document.head.appendChild(script);
      } catch (e) {
        reject(e as Error);
      }
    });

    window.__naverMapsPromise
      .then(() => setLoaded(true))
      .catch((e) => {
        console.error("[NAVER MAP] load failed:", e);
        setError(true);
      });
  }, []);

  return { loaded, error };
}
