// src/components/post/PostCard.jsx
import React, { useState, useEffect } from "react";
import "./PostCard.css";
import { FaHeart, FaBookmark } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import baseApi from "../../api/baseApi";

// ✅ 내 액션(색 유지)을 위한 세션 캐시
const ACTIONS_KEY = "articleActions"; // { [id]: { isLiked, isScraped, likeCount, scrapCount, ts } }

const readActions = () => {
  try {
    return JSON.parse(sessionStorage.getItem(ACTIONS_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeActions = (obj) => {
  try {
    sessionStorage.setItem(ACTIONS_KEY, JSON.stringify(obj));
  } catch {}
};

const patchArticleCache = (id, patch) => {
  const map = readActions();
  map[String(id)] = { ...(map[String(id)] || {}), ...patch, ts: Date.now() };
  writeActions(map);
};

const PostCard = ({ post, onPatch }) => {
  const navigate = useNavigate();

  // 표시/카운트 상태
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [bookmarkCount, setBookmarkCount] = useState(post.scrapCount ?? 0);

  // 서버/부모가 주는 값(없을 수도 있으니 안전하게)
  const likedFromProps = !!(post.isLiked ?? post.liked ?? post.isLike);
  const bookmarkedFromProps = !!(
    post.isScraped ??
    post.scraped ??
    post.bookmarked
  );

  // 👉 props로 1차 동기화 후, 세션 캐시(내 액션)로 최종 오버라이드 → 뒤로가도 색 유지
  useEffect(() => {
    // 1) props 기준
    setLiked(likedFromProps);
    setBookmarked(bookmarkedFromProps);
    setLikeCount(post.likeCount ?? 0);
    setBookmarkCount(post.scrapCount ?? 0);

    // 2) 내 액션이 있으면 최종 적용 (색 유지의 핵심)
    const cached = readActions()[String(post.id)];
    if (cached) {
      if (cached.isLiked !== undefined) setLiked(!!cached.isLiked);
      if (cached.isScraped !== undefined) setBookmarked(!!cached.isScraped);
      if (typeof cached.likeCount === "number") setLikeCount(cached.likeCount);
      if (typeof cached.scrapCount === "number")
        setBookmarkCount(cached.scrapCount);
    }
  }, [
    post.id,
    likedFromProps,
    bookmarkedFromProps,
    post.likeCount,
    post.scrapCount,
  ]);

  const handleCardClick = () => navigate(`/post/${post.id}`);

  const handleProfileClick = (e) => {
    e.stopPropagation();
    const authorId = post.author?.id || post.authorId;
    if (authorId) navigate(`/profile/${authorId}`);
  };

  const safeGetToken = () => {
    try {
      if (typeof window !== "undefined") {
        return (
          sessionStorage.getItem("accessToken") ||
          localStorage.getItem("accessToken")
        );
      }
    } catch {}
    return null;
  };

  // 좋아요 토글 (성공 시 세션에 내 상태 저장 → 뒤로가도 유지)
  const toggleLike = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const token = safeGetToken();
    if (!token) {
      alert("로그인이 필요합니다. (좋아요)");
      return;
    }

    try {
      if (!liked) {
        await baseApi.post(`/articles/${post.id}/likes`);
        setLiked(true);
        setLikeCount((v) => {
          const next = v + 1;
          patchArticleCache(post.id, { isLiked: true, likeCount: next });
          return next;
        });
        onPatch?.(post.id, { isLiked: true, likeCount: (likeCount ?? 0) + 1 });
      } else {
        await baseApi.delete(`/articles/${post.id}/likes`);
        setLiked(false);
        setLikeCount((v) => {
          const next = Math.max(0, v - 1);
          patchArticleCache(post.id, { isLiked: false, likeCount: next });
          return next;
        });
        onPatch?.(post.id, {
          isLiked: false,
          likeCount: Math.max(0, (likeCount ?? 0) - 1),
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "";
      const status = err.response?.status;

      // 서버와 불일치 보정
      if (!liked && status === 400 && /이미\s*좋아요/i.test(msg)) {
        try {
          await baseApi.delete(`/articles/${post.id}/likes`);
          setLiked(false);
          setLikeCount((v) => {
            const next = Math.max(0, v - 1);
            patchArticleCache(post.id, { isLiked: false, likeCount: next });
            return next;
          });
          onPatch?.(post.id, { isLiked: false });
          return;
        } catch {}
      }
      if (liked && status === 400 && /좋아요를\s*누르지\s*않은/i.test(msg)) {
        setLiked(false);
        setLikeCount((v) => {
          const next = Math.max(0, v - 1);
          patchArticleCache(post.id, { isLiked: false, likeCount: next });
          return next;
        });
        onPatch?.(post.id, { isLiked: false });
        return;
      }

      alert(`좋아요 처리 중 오류가 발생했습니다. ${msg ? `(${msg})` : ""}`);
    }
  };

  // 스크랩 토글 (성공 시 세션에 내 상태 저장 → 뒤로가도 유지)
  const toggleBookmark = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const token = safeGetToken();
    if (!token) {
      alert("로그인이 필요합니다. (스크랩)");
      return;
    }

    try {
      if (!bookmarked) {
        // 서버별 요구 데이터 차이 대응
        try {
          await baseApi.post(
            `/articles/${post.id}/scraps`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch {
          await baseApi.post(`/articles/${post.id}/scraps`, null, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        setBookmarked(true);
        setBookmarkCount((v) => {
          const next = v + 1;
          patchArticleCache(post.id, { isScraped: true, scrapCount: next });
          return next;
        });
        onPatch?.(post.id, {
          isScraped: true,
          scrapCount: (bookmarkCount ?? 0) + 1,
        });
      } else {
        await baseApi.delete(`/articles/${post.id}/scraps`);
        setBookmarked(false);
        setBookmarkCount((v) => {
          const next = Math.max(0, v - 1);
          patchArticleCache(post.id, { isScraped: false, scrapCount: next });
          return next;
        });
        onPatch?.(post.id, {
          isScraped: false,
          scrapCount: Math.max(0, (bookmarkCount ?? 0) - 1),
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "";
      const status = err.response?.status;

      if (!bookmarked && status === 400 && /이미\s*스크랩/i.test(msg)) {
        try {
          await baseApi.delete(`/articles/${post.id}/scraps`);
          setBookmarked(false);
          setBookmarkCount((v) => {
            const next = Math.max(0, v - 1);
            patchArticleCache(post.id, { isScraped: false, scrapCount: next });
            return next;
          });
          onPatch?.(post.id, { isScraped: false });
          return;
        } catch {}
      }
      if (bookmarked && status === 400 && /스크랩하지\s*않은/i.test(msg)) {
        setBookmarked(false);
        setBookmarkCount((v) => {
          const next = Math.max(0, v - 1);
          patchArticleCache(post.id, { isScraped: false, scrapCount: next });
          return next;
        });
        onPatch?.(post.id, { isScraped: false });
        return;
      }

      alert(`스크랩 처리 중 오류가 발생했습니다. ${msg ? `(${msg})` : ""}`);
    }
  };

  const tagMap = {
    RESTAURANT: "맛집",
    CAFE: "카페",
    TRAVEL: "여행지",
  };

  const formatDate = (dateString) => {
    if (!dateString) return "날짜 없음";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "날짜 없음";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}년 ${m}월 ${day}일`;
    } catch {
      return "날짜 없음";
    }
  };

  const getAuthorName = () =>
    post.author?.nickname || post.author?.name || post.authorName || "익명";

  const handleImageError = (e) => {
    if (e.target.src.includes("default-image.png")) return;
    e.target.src = "/default-image.png";
  };

  const handleProfileImageError = (e) => {
    if (e.target.src.includes("default-profile.png")) return;
    e.target.src = "/default-profile.png";
  };

  const truncateTitle = (title, maxLength = 60) => {
    if (!title) return "제목 없음";
    return title.length > maxLength
      ? `${title.substring(0, maxLength)}...`
      : title;
  };

  const formatCount = (count) => {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + "M";
    if (count >= 1_000) return (count / 1_000).toFixed(1) + "K";
    return String(count ?? 0);
  };

  return (
    <div className="post-card" onClick={handleCardClick}>
      {/* 상단 이미지 섹션 */}
      <div className="post-header">
        <div className="post-images">
          <img
            src={post.places?.[0]?.photoUrl || "/default-image.png"}
            alt={post.title || "게시글 이미지"}
            onError={handleImageError}
            className="main-image"
            loading="lazy"
          />
          {post.places?.[1]?.photoUrl ? (
            <img
              src={post.places[1].photoUrl}
              alt={`${post.title || "게시글"} 서브 이미지`}
              className="sub-image"
              onError={handleImageError}
              loading="lazy"
            />
          ) : (
            <div className="sub-image-placeholder" />
          )}
        </div>
      </div>

      {/* 콘텐츠 섹션 */}
      <div className="post-content">
        <div className="profile-date-section">
          <img
            src={post.author?.profileImageUrl || "/default-profile.png"}
            alt={`${getAuthorName()} 프로필`}
            className="profile-img"
            onError={handleProfileImageError}
            onClick={handleProfileClick}
            loading="lazy"
            style={{ cursor: "pointer" }}
          />
          <p className="post-date">
            {getAuthorName()} • {formatDate(post.createdAt)}
          </p>
        </div>

        <h3 className="post-title" title={post.title || "제목 없음"}>
          {truncateTitle(post.title)}
        </h3>

        <div className="post-bottom">
          <div className="post-tags">
            {post.tags &&
              post.tags.length > 0 &&
              post.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="tag"
                  title={`#${tagMap[tag] || tag}`}
                >
                  #{tagMap[tag] || tag}
                </span>
              ))}
          </div>

          <div className="post-actions">
            <button
              className={`action-btn bookmark-btn ${
                bookmarked ? "active" : ""
              }`}
              onClick={toggleBookmark}
              aria-label={`북마크 ${bookmarked ? "해제" : "추가"}`}
              title={`북마크 ${bookmarked ? "해제" : "추가"}`}
            >
              <FaBookmark />
              <span>{formatCount(bookmarkCount)}</span>
            </button>

            <button
              className={`action-btn like-btn ${liked ? "active" : ""}`}
              onClick={toggleLike}
              aria-label={`좋아요 ${liked ? "해제" : "추가"}`}
              title={`좋아요 ${liked ? "해제" : "추가"}`}
            >
              <FaHeart />
              <span>{formatCount(likeCount)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
