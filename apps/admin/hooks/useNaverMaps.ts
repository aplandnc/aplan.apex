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

    if (window.__naverMapsPromise) {
      window.__naverMapsPromise
        .then(() => setLoaded(true))
        .catch(() => setError(true));
      return;
    }

    window.__naverMapsPromise = new Promise<void>((resolve, reject) => {
      try {
        const oldScripts = document.querySelectorAll<HTMLScriptElement>(
          'script[src*="oapi.map.naver.com/openapi"]'
        );
        oldScripts.forEach((s) => s.remove());

        try {
          delete (window as any).naver;
        } catch {
          // ignore
        }

        const script = document.createElement("script");
        script.async = true;
        script.setAttribute("data-naver-map", "true");

        // ✅ 공식문서 방식 ncpKeyId 고정
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
          keyId
        )}&submodules=geocoder`;

        script.onload = () => {
          if ((window as any).naver?.maps) {
            window.__naverMapsLoaded = true;
            resolve();
          } else {
            reject(new Error("NAVER maps loaded but window.naver.maps is missing"));
          }
        };

        script.onerror = () => reject(new Error("NAVER maps script load error"));

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
