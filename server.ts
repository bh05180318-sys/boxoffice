import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const DEFAULT_API_KEY = "71659871ae605b875ef2d9fa87c037fc";

// 포스터 이미지 URL 캐시
const posterCache = new Map<string, string>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON 파싱 미들웨어
  app.use(express.json());

  // KOBIS 일일 박스오피스 API 프록시
  app.get("/api/boxoffice", async (req, res) => {
    try {
      const date = req.query.date as string;
      if (!date || !/^\d{8}$/.test(date)) {
        return res.status(400).json({ error: "올바른 날짜 형식(YYYYMMDD)을 입력해주세요." });
      }

      const apiKey = process.env.KOBIS_API_KEY || DEFAULT_API_KEY;
      const url = `http://kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=${apiKey}&targetDt=${date}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`KOBIS API responded with status ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Box Office API Error:", error);
      res.status(500).json({ error: "일일 박스오피스 데이터를 불러오는 중 오류가 발생했습니다." });
    }
  });

  // KOBIS 영화 상세 목록 API 프록시
  app.get("/api/movieinfo", async (req, res) => {
    try {
      const movieCd = req.query.movieCd as string;
      if (!movieCd) {
        return res.status(400).json({ error: "영화 코드(movieCd)가 필요합니다." });
      }

      const apiKey = process.env.KOBIS_API_KEY || DEFAULT_API_KEY;
      const url = `http://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json?key=${apiKey}&movieCd=${movieCd}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`KOBIS Detail API responded with status ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Movie Detail API Error:", error);
      res.status(500).json({ error: "영화 상세 정보를 불러오는 중 오류가 발생했습니다." });
    }
  });

  // Gemini Search Grounding 영화 포스터 조회 API
  app.get("/api/poster", async (req, res) => {
    try {
      const movieNm = req.query.movieNm as string;
      const openDt = req.query.openDt as string;

      if (!movieNm) {
        return res.status(400).json({ error: "movieNm(영화 이름)이 필요합니다." });
      }

      const cacheKey = `${movieNm}_${openDt || ""}`;
      if (posterCache.has(cacheKey)) {
        return res.json({ posterUrl: posterCache.get(cacheKey) });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY가 없습니다. 빈 결과를 제공합니다.");
        return res.json({ posterUrl: "" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Please search Google and find a direct public image URL (JPEG or PNG, e.g. from Naver Movie/Search, Daum Movie/Search, KMDB, Wikipedia, Watcha, namuwiki, or official kofic/kobis) for the official movie poster of the Korean movie named "${movieNm}" (released around ${openDt || "recent"}). Return ONLY a JSON object: {"posterUrl": "https://..."}. Let the URL be high quality, direct, and valid.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              posterUrl: {
                type: Type.STRING,
                description: "Direct high quality public image URL (JPEG/PNG) of the movie poster.",
              },
            },
            required: ["posterUrl"],
          },
        },
      });

      const text = response.text || "";
      const resultObj = JSON.parse(text.trim());
      const posterUrl = resultObj.posterUrl || "";

      if (posterUrl && (posterUrl.startsWith("http://") || posterUrl.startsWith("https://"))) {
        posterCache.set(cacheKey, posterUrl);
        return res.json({ posterUrl });
      }

      res.json({ posterUrl: "" });
    } catch (error) {
      console.error("Gemini Search Poster Generation error:", error);
      res.json({ posterUrl: "" });
    }
  });

  // 개발 환경과 실서비스 환경에 상이한 static 파일 서빙 구성
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server start failed:", err);
});
