import { useState, useEffect } from "react";
import Region from "../components/layout/Region";
import PostList from "../components/post/PostList";
import CategoryFilter from "../components/post/CategoryFilter";
import SortSelector from "../components/post/SortSelector";
import baseApi from "../api/baseApi";
import "./ScrapbookPage.css";

const CONTENT_WIDTH = 720; // 지역바/카테고리바/리스트 공통 폭

// 한글/영문 태그 매핑 (정규화에 사용)
const K2E = { 여행지: "TRAVEL_SPOT", 맛집: "RESTAURANT", 카페: "CAFE" };
const E2E = {
  TRAVEL_SPOT: "TRAVEL_SPOT",
  RESTAURANT: "RESTAURANT",
  CAFE: "CAFE",
};

// 서버 응답의 태그 필드를 표준 코드로 정규화
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

// 선택된 태그(AND 조건)로 필터
function matchBySelectedTags(post, selected) {
  if (!selected || selected.length === 0) return true;
  const postTags = normalizePostTags(post);
  if (postTags.length === 0) return false;
  const want = new Set(selected.map((s) => s.value));
  for (const v of want) if (!postTags.includes(v)) return false;
  return true;
}

const SORT_MAP = {
  기본순: "createdAt,desc",
  좋아요순: "likeCount,desc",
};

const REGION_MAP = {
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

const ScrapbookPage = () => {
  const [region, setRegion] = useState(""); // ex) "서울"
  const [sortOrder, setSortOrder] = useState("기본순");
  const [posts, setPosts] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]); // CategoryFilter의 선택 결과 (배열)

  const tagMap = {
    여행지: "TRAVEL_SPOT",
    맛집: "RESTAURANT",
    카페: "CAFE",
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };
  // 스크랩한 게시글 목록 조회

  useEffect(() => {
    const fetchScrapedPosts = async () => {
      const token = getToken();
      if (!token) {
        console.log("로그인이 필요합니다.");
        return;
      }
      try {
        // --- 쿼리 파라미터 조립 ---
        const params = {
          page: 0,
          size: 10,
          sort: SORT_MAP[sortOrder] || "createdAt,desc",
        };

        // 태그: 1개면 tag, 여러개면 tags(콤마) — 서버가 읽는 포맷 아무거나 한 개만 써도 됨
        const tagValues = selectedTags.map((t) => t.value).filter(Boolean);
        if (tagValues.length === 1) params.tag = tagValues[0];
        else if (tagValues.length > 1) params.tags = tagValues.join(",");

        // 지역: 서버 키가 다르면 여기서 교체 (예: params.sido = ...)
        if (region) params.region = REGION_MAP[region] || region;
        s;

        // --- 응답 처리 + 클라이언트 보정 필터 ---
        const serverList =
          res.data?.data?.content ??
          res.data?.content ??
          res.data?.data ??
          res.data ??
          [];

        const arr = Array.isArray(serverList) ? serverList : [];
        const filtered = arr.filter((p) =>
          matchBySelectedTags(p, selectedTags)
        );
        setPosts(filtered);
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
        const tagsQuery =
          selectedTags.length > 0
            ? selectedTags.map((t) => tagMap[t]).join(",")
            : undefined;

        const res = await baseApi.get("user/scraps", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page: 0,
            size: 10,
            sort:
              sortOrder === "좋아요순" ? "likeCount,desc" : "createdAt,desc",
            ...(tagsQuery && { tags: tagsQuery }),
            ...(regionQuery && { region: regionQuery }), // tag가 있을 때만 추가
          },
        });

        const postsData = res.data.data?.content || [];

        setPosts(postsData);
      } catch (err) {
        console.error(
          "[스크랩북] API 오류:",
          err.response?.status,
          err.message
        );
      }
    };

    // 선택 태그/지역/정렬이 바뀔 때마다 재조회
    fetchScrapedPosts();
  }, [selectedTags, region, sortOrder]);

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
      <div
        className="top-bar"
        style={{
          width: `min(100%, ${CONTENT_WIDTH}px)`,
          margin: "0 auto",
          padding: 0,
          boxSizing: "border-box",
        }}
      >
        <Region region={region} onChange={setRegion} />
      </div>

      {/* 카테고리 칩 + 정렬 */}
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
          <div className="category-btns">
            {["여행지", "맛집", "카페"].map((cat) => (
              <button
                key={cat}
                className={`category-btn ${
                  selectedTags.includes(cat) ? "active" : ""
                }`}
                onClick={() => toggleTag(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* ✅ SortSelector 사용 */}

          <SortSelector value={sortOrder} onChange={setSortOrder} />
        </div>
        {/* 리스트 */}
        <div
          style={{ width: `min(100%, ${CONTENT_WIDTH}px)`, margin: "0 auto" }}
        >
          <PostList
            posts={posts}
            region={region}
            categories={selectedTags}
            sortOrder={sortOrder}
            isScrapMode={true}
            onScrapToggle={handleScrapToggle}
          />
        </div>
      </div>
    </div>
  );
};

export default ScrapbookPage;
