import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_API_KEY = "71659871ae605b875ef2d9fa87c037fc";

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
