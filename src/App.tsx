/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Sun,
  Moon,
  Film,
  Clock,
  User,
  Users,
  Building,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Clapperboard,
  X,
  Languages,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import {
  DailyBoxOfficeItem,
  BoxOfficeApiResponse,
  MovieInfo,
  MovieInfoApiResponse,
} from "./types";

// 현재 날짜 기준 어제 날짜 구하기 (YYYY-MM-DD 형식)
const getYesterdayString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function App() {
  // 테마 상태 (light | dark)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("kobis-theme");
      if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark"; // Default to dark as requested by theme
  });

  // 날짜 상태 (기본값: 어제)
  const [selectedDate, setSelectedDate] = useState<string>(getYesteryesterdayIfUnavailable);
  const [boxOfficeList, setBoxOfficeList] = useState<DailyBoxOfficeItem[]>([]);
  const [isListLoading, setIsListLoading] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);

  // 선택된 영화 대표코드 및 상세 정보 상태
  const [selectedMovieCd, setSelectedMovieCd] = useState<string | null>(null);
  const [movieDetail, setMovieDetail] = useState<MovieInfo | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 어제 날짜 구하기 헬퍼
  function getYesteryesterdayIfUnavailable() {
    return getYesterdayString();
  }

  const maxDate = getYesterdayString();

  // 테마 동기화 및 바디 백그라운드 매칭
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("kobis-theme", theme);
  }, [theme]);

  // 박스오피스 목록 조회 (날짜가 바뀔 때)
  useEffect(() => {
    const fetchBoxOffice = async () => {
      if (!selectedDate) return;
      setIsListLoading(true);
      setListError(null);
      
      // API용 날짜 포맷 (YYYYMMDD)
      const formattedDate = selectedDate.replace(/-/g, "");
      
      try {
        const response = await fetch(`/api/boxoffice?date=${formattedDate}`);
        if (!response.ok) {
          throw new Error("서버와의 통신 도중 에러가 발생했습니다.");
        }
        const data: BoxOfficeApiResponse = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const list = data.boxOfficeResult?.dailyBoxOfficeList || [];
        setBoxOfficeList(list);

        // 첫 번째 영화를 자동으로 선택하여 빈 화면을 보완
        if (list.length > 0 && !selectedMovieCd) {
          setSelectedMovieCd(list[0].movieCd);
        }
      } catch (err: any) {
        setListError(err.message || "데이터를 불러오는 데 실패했습니다.");
        setBoxOfficeList([]);
      } finally {
        setIsListLoading(false);
      }
    };

    fetchBoxOffice();
  }, [selectedDate]);

  // 영화 상세 정보 조회 (선택된 movieCd가 바뀔 때)
  useEffect(() => {
    const fetchMovieDetail = async () => {
      if (!selectedMovieCd) {
        setMovieDetail(null);
        return;
      }

      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const response = await fetch(`/api/movieinfo?movieCd=${selectedMovieCd}`);
        if (!response.ok) {
          throw new Error("서버와의 통신 도중 상세 데이터를 받을 수 없었습니다.");
        }
        const data: MovieInfoApiResponse = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.movieInfoResult?.movieInfo) {
          setMovieDetail(data.movieInfoResult.movieInfo);
        } else {
          throw new Error("상세 영화 정보가 존재하지 않습니다.");
        }
      } catch (err: any) {
        setDetailError(err.message || "상세 정보를 불러오는 중 에러가 발생했습니다.");
        setMovieDetail(null);
      } finally {
        setIsDetailLoading(false);
      }
    };

    fetchMovieDetail();
  }, [selectedMovieCd]);

  // 날짜 간편 내비게이터 (하루 이동)
  const handleDateChangeByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const targetDateStr = current.toISOString().split("T")[0];

    // 오늘 날짜 이전(어제 이하) 인지 검증
    if (targetDateStr <= maxDate) {
      setSelectedDate(targetDateStr);
    }
  };

  // 금액 포맷터
  const formatCurrency = (val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return "0";
    return new Intl.NumberFormat("ko-KR", { style: "decimal" }).format(num);
  };

  // 관객수 포맷터
  const formatAudience = (val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return "0";
    return new Intl.NumberFormat("ko-KR").format(num);
  };

  // 날짜 포맷터 (YYYY년 MM월 DD일)
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
    }
    return dateStr;
  };

  // 선택된 영화의 추가 집계 정보 추출 함수 (목록 연동)
  const selectedBoxOfficeItem = boxOfficeList.find(m => m.movieCd === selectedMovieCd);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === "dark" ? "bg-[#0a0a0a] text-slate-200" : "bg-[#f8fafc] text-slate-800"
    } font-sans`}>
      
      {/* Sophisticated Dark Header Navigation */}
      <header className={`h-16 flex items-center justify-between px-4 sm:px-8 border-b shrink-0 sticky top-0 z-40 backdrop-blur-md ${
        theme === "dark" ? "bg-[#0d0d0d]/90 border-[#222]" : "bg-white/90 border-slate-200"
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 flex items-center justify-center font-bold text-white tracking-widest text-sm rounded shadow-sm">
            K
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold tracking-tight uppercase select-none flex items-center gap-2">
              KOBIS BOX OFFICE
              <span className="hidden sm:inline px-1.5 py-0.5 bg-red-600/10 text-red-500 border border-red-900/40 text-[9px] font-mono tracking-wider rounded uppercase">
                Interactive
              </span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Target Date Input Container */}
          <div className={`flex items-center rounded-full px-3.5 py-1 sm:py-1.5 border ${
            theme === "dark" ? "bg-[#161616] border-[#333]" : "bg-white border-slate-200"
          }`}>
            <span className="text-[10px] sm:text-xs font-mono text-slate-500 mr-2 sm:mr-3 uppercase">DATE</span>
            <input
              type="date"
              value={selectedDate}
              max={maxDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              className="bg-transparent text-xs sm:text-sm border-none focus:outline-none focus:ring-0 text-slate-200 dark:text-slate-200 font-mono cursor-pointer"
              id="date-picker-input"
            />
          </div>
          
          {/* 테마 토글 버튼 그룹 */}
          <div className={`flex items-center gap-1 p-1 rounded-lg border ${
            theme === "dark" ? "bg-[#161616] border-[#333]" : "bg-white border-slate-200"
          }`}>
            <button
              onClick={() => setTheme("dark")}
              className={`px-3 py-1 text-[11px] font-semibold rounded cursor-pointer transition-all ${
                theme === "dark" ? "bg-[#333] text-white" : "text-slate-400 hover:text-slate-600"
              }`}
              id="theme-toggle-dark"
            >
              Dark
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`px-3 py-1 text-[11px] font-semibold rounded cursor-pointer transition-all ${
                theme === "light" ? "bg-slate-200 text-slate-950" : "text-slate-500 hover:text-slate-400"
              }`}
              id="theme-toggle-light"
            >
              Light
            </button>
          </div>
        </div>
      </header>

      {/* 날짜 세밀 조작 콘트롤 패널 */}
      <div className={`px-4 sm:px-8 py-2.5 border-b flex flex-wrap items-center justify-between text-xs gap-3 ${
        theme === "dark" ? "bg-[#0a0a0a] border-[#1a1a1a] text-slate-400" : "bg-slate-50 border-slate-100 text-slate-600"
      }`}>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-red-500" />
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
            기준 일자 변경:
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleDateChangeByDays(-1)}
              className={`px-2 py-0.5 border text-[10px] rounded transition-all flex items-center gap-0.5 ${
                theme === "dark" ? "hover:bg-[#222] border-[#333] text-slate-300" : "hover:bg-slate-100 border-slate-200 text-slate-700"
              } cursor-pointer`}
              title="하루 전"
            >
              <ChevronLeft className="w-3 h-3" />
              어제
            </button>
            <button
              onClick={() => handleDateChangeByDays(1)}
              disabled={selectedDate >= maxDate}
              className={`px-2 py-0.5 border text-[10px] rounded transition-all flex items-center gap-0.5 ${
                selectedDate >= maxDate
                  ? "opacity-30 cursor-not-allowed text-stone-600"
                  : theme === "dark" ? "hover:bg-[#222] border-[#333] text-slate-300" : "hover:bg-slate-100 border-slate-200 text-slate-700"
              } cursor-pointer`}
              title="하루 후"
            >
              내일
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold px-2 py-0.5 rounded text-[10px] uppercase bg-red-600/10 text-red-500">
            {formatDateLabel(selectedDate)}
          </span>
          <span className="hidden md:inline text-slate-500">
            ※ 오늘 이전 일자 데이터만 정상적으로 조회할 수 있습니다.
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Sidebar: Ranking List (lg:col-span-5) */}
        <section className={`w-full lg:w-160 lg:border-r border-b lg:border-b-0 flex flex-col shrink-0 ${
          theme === "dark" ? "bg-[#0d0d0d] border-[#1e1e1e]" : "bg-slate-50 border-slate-200"
        }`}>
          <div className={`p-4 border-b flex justify-between items-center ${
            theme === "dark" ? "border-[#1e1e1e]" : "border-slate-200"
          }`}>
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-red-500 animate-spin-slow" />
              일일 박스오피스 순위
            </span>
            <span className="text-[10px] uppercase text-red-500 font-mono font-bold tracking-wide">
              Live Feed
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px] lg:max-h-[calc(100vh-10rem)] scrollbar-thin">
            
            {/* 에러 상태 피드백 */}
            {listError && (
              <div className="p-6 text-center m-4 rounded bg-red-600/5 border border-red-900/30">
                <p className="text-xs text-red-400 mb-2">{listError}</p>
                <button
                  onClick={() => setSelectedDate(getYesterdayString())}
                  className="px-3 py-1 bg-red-600 text-white rounded text-[10px] tracking-tight hover:bg-red-500 cursor-pointer flex items-center gap-1 mx-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  어제 날짜로 리셋
                </button>
              </div>
            )}

            {/* 로딩 진행 바 */}
            {isListLoading ? (
              <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-6 h-6 rounded-full border-2 border-red-600/20 border-t-red-500 animate-spin"></div>
                <p className="text-[11px] tracking-wider text-slate-500 font-mono uppercase">FEED LOADING...</p>
              </div>
            ) : !listError && boxOfficeList.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <Film className="w-10 h-10 text-slate-600 mb-2 opacity-50" />
                <p className="text-xs text-slate-500 font-medium">조회된 데이터가 없습니다.</p>
                <p className="text-[10px] text-slate-500 mt-1">이전 일자로 이동해보시기 바랍니다.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-900">
                {boxOfficeList.map((movie) => {
                  const isSelected = selectedMovieCd === movie.movieCd;
                  const rankInten = parseInt(movie.rankInten, 10);
                  const rankNum = String(movie.rank).padStart(2, "0");

                  return (
                    <div
                      key={movie.movieCd}
                      onClick={() => setSelectedMovieCd(movie.movieCd)}
                      className={`p-4 transition-all flex gap-4 cursor-pointer select-none items-center ${
                        isSelected
                          ? "bg-red-600/10 border-l-2 border-red-600 hover:bg-red-600/15"
                          : theme === "dark"
                          ? "bg-transparent hover:bg-[#121212] border-l-2 border-transparent"
                          : "bg-transparent hover:bg-white border-l-2 border-transparent"
                      }`}
                      id={`rank-item-${movie.movieCd}`}
                    >
                      {/* 순위 인덱스 */}
                      <span className={`font-mono text-2xl font-bold leading-none shrink-0 w-8 ${
                        isSelected
                          ? "text-red-500"
                          : theme === "dark" ? "text-slate-600" : "text-slate-400"
                      }`}>
                        {rankNum}
                      </span>

                      {/* 영화 제목 및 개봉일자 */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-xs sm:text-sm font-semibold truncate ${
                          isSelected ? "text-red-500 font-bold" : theme === "dark" ? "text-slate-200" : "text-slate-800"
                        }`}>
                          {movie.movieNm}
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          개봉일 {movie.openDt}
                        </p>
                      </div>

                      {/* 변동 정보 배지 */}
                      <div className="text-right shrink-0 flex items-center space-x-2.5">
                        <div className="flex flex-col items-end">
                          <span className={`font-mono text-[11px] font-bold ${
                            theme === "dark" ? "text-slate-300" : "text-slate-700"
                          }`}>
                            {formatAudience(movie.audiCnt)}명
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            누적 {formatAudience(movie.audiAcc)}
                          </span>
                        </div>

                        {/* 신작 혹은 등락 마킹 */}
                        <div className="w-12 flex justify-end">
                          {movie.rankOldAndNew === "NEW" ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-600 text-white rounded">
                              NEW
                            </span>
                          ) : rankInten > 0 ? (
                            <span className="text-[9px] font-bold text-green-500 flex items-center gap-0.5 font-mono">
                              ▲ {rankInten}
                            </span>
                          ) : rankInten < 0 ? (
                            <span className="text-[9px] font-bold text-red-500 flex items-center gap-0.5 font-mono">
                              ▼ {Math.abs(rankInten)}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500 dark:text-zinc-600 font-mono">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Detail View Area: Cinema Inspired Presentation */}
        <section className={`flex-1 flex flex-col overflow-y-auto p-4 sm:p-10 lg:p-12 ${
          theme === "dark" ? "bg-[#0a0a0a]" : "bg-white"
        }`}>
          <AnimatePresence mode="wait">
            {selectedMovieCd ? (
              <motion.div
                key={selectedMovieCd}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col xl:flex-row gap-8 lg:gap-12"
              >
                {/* 1. Poster Placeholder */}
                <div className={`w-full xl:w-72 h-44 xl:h-110 border shrink-0 rounded-sm flex items-center justify-center p-6 text-center select-none relative overflow-hidden ${
                  theme === "dark" ? "bg-[#0d0d0d] border-[#222]" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                  <div>
                    <div className="w-10 h-0.5 bg-red-600 mx-auto mb-4"></div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                      Cinema Overview
                    </p>
                    <p className="font-serif italic text-xl md:text-2xl text-slate-800 dark:text-slate-100 max-w-64 leading-relaxed tracking-wide font-extrabold">
                      {movieDetail?.movieNm || selectedBoxOfficeItem?.movieNm}
                    </p>
                    {movieDetail?.movieNmEn && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-1 max-w-60 mx-auto truncate">
                        {movieDetail.movieNmEn}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Movie Info Content */}
                <div className="flex-1 flex flex-col">
                  {/* 상단 섹션 */}
                  <div className="mb-6">
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Film className="w-3 h-3 text-red-500" />
                      현재 상세 보기 대상 정보
                    </p>
                    <h2 className="text-3xl sm:text-5xl font-black uppercase leading-tight tracking-tighter text-slate-900 dark:text-white">
                      {movieDetail ? movieDetail.movieNm : selectedBoxOfficeItem?.movieNm}
                    </h2>
                    
                    {/* 상하 배지 목록 */}
                    <div className="flex flex-wrap gap-2 mt-4 text-xs font-bold text-slate-300">
                      {movieDetail?.genres && movieDetail.genres.length > 0 && (
                        <span className={`px-2 py-0.5 border text-[10px] uppercase ${
                          theme === "dark" ? "border-slate-800 text-slate-400 bg-slate-950/20" : "border-slate-200 text-slate-600 bg-slate-100/50"
                        }`}>
                          {movieDetail.genres.map(g => g.genreNm).join(" / ")}
                        </span>
                      )}
                      {movieDetail?.showTm && (
                        <span className={`px-2 py-0.5 border text-[10px] uppercase ${
                          theme === "dark" ? "border-slate-800 text-slate-400 bg-slate-950/20" : "border-slate-200 text-slate-600 bg-slate-100/50"
                        }`}>
                          {movieDetail.showTm} 분
                        </span>
                      )}
                      {movieDetail?.audits && movieDetail.audits.length > 0 ? (
                        <span className="px-2 py-0.5 border border-red-600/40 text-red-500 text-[10px] uppercase bg-red-600/5">
                          {movieDetail.audits[0].watchGradeNm}
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 border text-[10px] uppercase ${
                          theme === "dark" ? "border-slate-800 text-slate-400 bg-slate-950/20" : "border-slate-200 text-slate-600 bg-slate-100/50"
                        }`}>
                          관람가 정보 없음
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 세부 메타데이터 그리드 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-2">
                    <div>
                      <h4 className="text-[10px] uppercase text-slate-500 mb-1 font-bold tracking-wider">
                        감독 (Director)
                      </h4>
                      <p className={`text-sm sm:text-base font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                        {movieDetail && movieDetail.directors.length > 0 ? (
                          movieDetail.directors.map(d => d.peopleNm).join(", ")
                        ) : (
                          <span className="text-slate-500 italic">영진위 DB 미제공</span>
                        )}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase text-slate-500 mb-1 font-bold tracking-wider">
                        개봉 일자 (Release Date)
                      </h4>
                      <p className={`text-sm sm:text-base font-mono font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                        {movieDetail?.openDt ? (
                          `${movieDetail.openDt.substring(0,4)}-${movieDetail.openDt.substring(4,6)}-${movieDetail.openDt.substring(6,8)}`
                        ) : (
                          selectedBoxOfficeItem?.openDt || "-"
                        )}
                      </p>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-[10px] uppercase text-slate-500 mb-1.5 font-bold tracking-wider">
                        주요 출연진 (Lead Cast)
                      </h4>
                      <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                        {movieDetail && movieDetail.actors.length > 0 ? (
                          movieDetail.actors.slice(0, 10).map(a => `${a.peopleNm}${a.cast ? `(${a.cast})` : ""}`).join(", ")
                        ) : (
                          <span className="text-slate-500 italic">조회된 배우 정보가 부재하거나 로딩 중입니다.</span>
                        )}
                        {movieDetail && movieDetail.actors.length > 10 && (
                          <span className="text-red-500 text-xs ml-1 font-bold">외 {movieDetail.actors.length - 10}명 더 있음</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 일일 집계 현황 메타 카드 디테일 */}
                  <div className={`flex-1 border-t pt-6 ${
                    theme === "dark" ? "border-[#222]" : "border-slate-200"
                  }`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`p-4 border ${
                        theme === "dark" ? "bg-[#0d0d0d] border-[#222]" : "bg-slate-50 border-slate-200/60"
                      }`}>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase mb-1 font-semibold tracking-wide flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          당일 관람객 수
                        </p>
                        <p className="text-lg sm:text-2xl font-mono font-bold text-red-500">
                          {selectedBoxOfficeItem ? formatAudience(selectedBoxOfficeItem.audiCnt) : "0"} <span className="text-xs">명</span>
                        </p>
                      </div>

                      <div className={`p-4 border ${
                        theme === "dark" ? "bg-[#0d0d0d] border-[#222]" : "bg-slate-50 border-slate-200/60"
                      }`}>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase mb-1 font-semibold tracking-wide flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          누적 관람객 수
                        </p>
                        <p className="text-lg sm:text-2xl font-mono font-bold text-slate-800 dark:text-slate-200">
                          {selectedBoxOfficeItem ? formatAudience(selectedBoxOfficeItem.audiAcc) : "0"} <span className="text-xs">명</span>
                        </p>
                      </div>

                      <div className={`p-4 border ${
                        theme === "dark" ? "bg-[#0d0d0d] border-red-600/20" : "bg-red-50/20 border-red-100"
                      }`}>
                        <p className="text-[10px] text-red-500 uppercase mb-1 font-semibold tracking-wide flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                          매출 점유율
                        </p>
                        <p className="text-lg sm:text-2xl font-mono font-bold text-red-600 dark:text-red-400">
                          {selectedBoxOfficeItem ? selectedBoxOfficeItem.salesShare : "0"}%
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8 pb-4">
                      {/* 상세 세부 기획 정보 등 */}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {movieDetail?.companys && movieDetail.companys.length > 0 && (
                          <p>
                            제작/배급사: <strong className="text-slate-700 dark:text-slate-300">{movieDetail.companys[0].companyNm}</strong>
                          </p>
                        )}
                        <p className="mt-0.5">※ 본 수치는 영화관입장권통합전산망 제공 일일 정산 수액을 반영한 결과입니다.</p>
                      </div>

                      <a
                        href={`https://search.naver.com/search.naver?query=영화+${encodeURIComponent(movieDetail?.movieNm || selectedBoxOfficeItem?.movieNm || "")}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded shadow-md tracking-tight inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
                      >
                        네이버 검색 연결
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                </div>
              </motion.div>
            ) : (
              // 영화 미선택 화면
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-1 bg-red-600 mb-4 animate-pulse"></div>
                <Clapperboard className="w-16 h-16 text-slate-600 dark:text-slate-700 mb-3" />
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                  선택된 영화 장치가 없습니다
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                  좌측 일일 영화 목록 중 순위 데이터를 클릭하여 세밀한 등급 명세, 상영 분수, 감독 및 소속 제작사 등을 실시간으로 로드하세요.
                </p>
              </div>
            )}
          </AnimatePresence>
        </section>

      </main>

      {/* Footer Status Bar with sophisticated details */}
      <footer className={`h-10 border-t px-4 sm:px-8 flex items-center justify-between select-none ${
        theme === "dark" ? "bg-[#0d0d0d] border-[#222] text-slate-500" : "bg-white border-slate-200 text-slate-400"
      }`}>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="uppercase font-mono">Source: KOBIS (Korean Film Council)</span>
          <span className="w-1 h-1 bg-slate-700 rounded-full hidden sm:inline"></span>
          <span className="uppercase hidden sm:inline">API Ver: 2.1</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[#ef4444] font-bold">
          2026 © Cinema Insight Platform
        </div>
      </footer>

    </div>
  );
}
