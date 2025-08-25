// src/pages/ScrapbookPage.jsx
import { useState, useEffect } from "react";
import { useCategory } from "../context/CategoryContext";
import Region from "../components/layout/Region";
import PostList from "../components/post/PostList";
import CategoryFilter from "../components/post/CategoryFilter";
import SortSelector from "../components/post/SortSelector"; // ✅ 추가
import baseApi from "../api/baseApi";
import "./ScrapbookPage.css";

const CONTENT_WIDTH = 720; // 지역바/카테고리바/리스트 공통 폭

const K2E = { 여행지: "TRAVEL_SPOT", 맛집: "RESTAURANT", 카페: "CAFE" };
const E2E = {
  TRAVEL_SPOT: "TRAVEL_SPOT",
  RESTAURANT: "RESTAURANT",
  CAFE: "CAFE",
};

function normalizePostTags(post) {
  const raw =
    post?.tags ?? post?.tagList ?? post?.categories ?? post?.category ?? [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .map((t) => {
      if (!t) return null;
      if (typeof t === "string") return E2E[t] || E2E[K2E[t]] || null;
      const v = t.value ?? t.code ?? t.name ?? t.label;
      return v ? E2E[v] || E2E[K2E[v]] || null : null;
    })
    .filter(Boolean);
}

function matchBySelectedTags(post, selected) {
  if (!selected || selected.length === 0) return true;
  const postTags = normalizePostTags(post);
  if (postTags.length === 0) return false;
  const want = new Set(selected.map((s) => s.value));
  for (const v of want) if (!postTags.includes(v)) return false;
  return true;
}

const ScrapbookPage = () => {
  const { selectedCategory } = useCategory(); // 다른 곳에서 필요하면 유지
  const [region, setRegion] = useState("");
  const [sortOrder, setSortOrder] = useState("기본순"); // ✅ 기존 그대로 사용
  const [posts, setPosts] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]); // 멀티선택, 기본 미선택

  const getToken = () =>
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    "";

  useEffect(() => {
    const fetchScrapedPosts = async () => {
      const token = getToken();
      if (!token) {
        console.log("로그인이 필요합니다.");
        return;
      }
      try {
        const params = { page: 0, size: 10, sort: "createdAt,desc" };
        const values = selectedTags.map((t) => t.value);
        if (values.length === 1) params.tag = values[0];
        if (values.length > 1) params.tags = values.join(",");

        const tagsQuery = tagMap[selectedCategory] || "";
        console.log(`[스크랩북] ${selectedCategory} 조회 시작`);

        const regionMap = {
          서울: "서울특별시",
          부산: "부산광역시",
          대구: "대구광역시",
          인천: "인천광역시",
          광주: "광주광역시",
          대전: "대전광역시",
          울산: "울산광역시",
          세종: "세종특별자치시",
          경기: "경기도",
          강원: "강원특별자치도",
          충북: "충청북도",
          충남: "충청남도",
          전북: "전북특별자치도",
          전남: "전라남도",
          경북: "경상북도",
          경남: "경상남도",
          제주: "제주특별자치도",
        };
        const regionQuery = region ? regionMap[region] : undefined;
        // API 엔드포인트 수정 시도
        const res = await baseApi.get("user/scraps", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page: 0,
            size: 10,
            sort: "createdAt,desc",
            ...(tagsQuery && { tag: tagsQuery }), // tag가 있을 때만 추가
          },
        });

        const serverList = res.data?.data?.content || [];
        const filtered = serverList.filter((p) =>
          matchBySelectedTags(p, selectedTags)
        );
        setPosts(filtered);
      } catch (err) {
        console.error(
          "[스크랩북] API 오류:",
          err.response?.status,
          err.message
        );
      }
    };

    fetchScrapedPosts();
  }, [selectedTags]);

  const handleScrapToggle = async (articleId, isCurrentlyScraped) => {
    const token = getToken();
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      if (isCurrentlyScraped) {
        await baseApi.delete(`/articles/${articleId}/scraps`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPosts((prev) => prev.filter((p) => p.id !== articleId));
        alert("스크랩이 취소되었습니다.");
      } else {
        await baseApi.post(
          `/articles/${articleId}/scraps`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("스크랩에 추가되었습니다.");
      }
    } catch (err) {
      console.error("[스크랩] 처리 오류:", err.response?.status);
      if (err.response?.status === 401)
        alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
      else alert("스크랩 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="scrapbook-page">
      <div className="page-header">
        <h3 className="page-title" style={{ textAlign: "center" }}>
          스크랩북
        </h3>
      </div>

      {/* 지역 선택바 */}
      <div
        className="top-bar"
        style={{
          width: `min(100%, ${CONTENT_WIDTH}px)`,
          margin: "0 auto",
          padding: 0,
          boxSizing: "border-box",
        }}
      >
        <Region value={region} onChange={setRegion} />
      </div>

      {/* 카테고리 + 정렬 */}
      <div
        className="filter-bar"
        style={{
          width: `min(100%, ${CONTENT_WIDTH}px)`,
          margin: "0 auto",
          padding: 0,
          boxSizing: "border-box",
        }}
      >
        <div className="filter-chips">
          <CategoryFilter
            selectedCategories={selectedTags}
            onCategoryChange={setSelectedTags}
          />
        </div>

        {/* ✅ SortSelector 사용 */}
        <SortSelector value={sortOrder} onChange={setSortOrder} />
      </div>

      {/* 리스트 */}
      <div style={{ width: `min(100%, ${CONTENT_WIDTH}px)`, margin: "0 auto" }}>
        <PostList
          posts={posts}
          region={region}
          sortOrder={sortOrder}
          isScrapMode
          onScrapToggle={handleScrapToggle}
        />
      </div>
    </div>
  );
};

export default ScrapbookPage;
