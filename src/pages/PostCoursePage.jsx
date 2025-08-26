// src/pages/PostCoursePage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaHeart, FaBookmark, FaArrowLeft, FaEdit } from "react-icons/fa";
import "./PostCoursePage.css";
import baseApi from "../api/baseApi";
import Mapview from "../components/main/Mapview";

const TAG_LABELS = {
  CAFE: "카페",
  RESTAURANT: "맛집",
  TRAVEL_SPOT: "여행지",
};

const ACTIONS_KEY = "articleActions";

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
const patchArticleCache = (articleId, patch) => {
  const map = readActions();
  map[String(articleId)] = { ...(map[String(articleId)] || {}), ...patch };
  writeActions(map);
};

const PostCoursePage = ({ mapRef }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isLiked, setIsLiked] = useState(false);
  const [isScraped, setIsScraped] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [scrapCount, setScrapCount] = useState(0);

  // (모달 편집 제거: isEditing/editForm는 유지해도 무방)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    region: "",
    tags: [],
    places: [],
  });

  const handleGoBack = () => navigate(-1);

  const ensureToken = () => {
    const token =
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      return null;
    }
    return token;
  };

  // 현재 사용자가 작성자인지 확인
  const isAuthor =
    currentUser &&
    post &&
    (currentUser.id === post.authorId ||
      currentUser.id === post.author?.id ||
      currentUser.id === post.userId);

  // 수정 페이지로 이동
  const handleEditClick = () => navigate(`/edit/${id}`);

  // (모달 잔여 핸들러: 사용 안 해도 무방)
  const handleEditClose = () => {
    setIsEditing(false);
    setEditForm({ title: "", region: "", tags: [], places: [] });
  };
  const handleEditSave = async () => {
    const token = ensureToken();
    if (!token) return;
    try {
      setLoading(true);
      const updateData = {
        title: editForm.title,
        region: editForm.region,
        tags: editForm.tags,
        places: editForm.places,
      };
      const response = await baseApi.put(`/articles/${id}`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.data?.success || response.status === 200) {
        const updatedPost = response.data?.data || response.data;
        setPost((prev) => ({ ...prev, ...updatedPost }));
        setIsEditing(false);
        alert("게시글이 수정되었습니다.");
      }
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      if (error.response?.status === 403)
        alert("본인이 작성한 게시글만 수정할 수 있습니다.");
      else alert("게시글 수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 폼 입력/태그 토글 (미사용 가능)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleTagToggle = (tag) => {
    setEditForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // 좋아요 토글
  const handleLikeToggle = async () => {
    const token = ensureToken();
    if (!token) return;

    try {
      if (isLiked) {
        await baseApi.delete(`articles/${id}/likes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLikeCount((prev) => {
          const next = Math.max(0, prev - 1);
          setIsLiked(next > 0);
          patchArticleCache(id, { isLiked: next > 0, likeCount: next });
          return next;
        });
      } else {
        await baseApi.post(
          `articles/${id}/likes`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLikeCount((prev) => {
          const next = prev + 1;
          setIsLiked(next > 0);
          patchArticleCache(id, { isLiked: next > 0, likeCount: next });
          return next;
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "";
      const status = err.response?.status;

      // 서버-UI 엇갈림 보정
      if (!isLiked && status === 400 && /이미\s*좋아요/i.test(msg)) {
        try {
          await baseApi.delete(`articles/${id}/likes`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setLikeCount((prev) => {
            const next = Math.max(0, prev - 1);
            setIsLiked(next > 0);
            patchArticleCache(id, { isLiked: next > 0, likeCount: next });
            return next;
          });
          return;
        } catch {}
      }
      if (isLiked && status === 400 && /좋아요를\s*누르지\s*않은/i.test(msg)) {
        setLikeCount((prev) => {
          const next = Math.max(0, prev - 1);
          setIsLiked(next > 0);
          patchArticleCache(id, { isLiked: next > 0, likeCount: next });
          return next;
        });
        return;
      }

      alert(`좋아요 처리 중 오류가 발생했습니다. ${msg ? `(${msg})` : ""}`);
    }
  };

  // 스크랩 토글
  const handleScrapToggle = async () => {
    const token = ensureToken();
    if (!token) return;

    try {
      if (isScraped) {
        await baseApi.delete(`articles/${id}/scraps`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setScrapCount((prev) => {
          const next = Math.max(0, prev - 1);
          setIsScraped(next > 0);
          patchArticleCache(id, { isScraped: next > 0, scrapCount: next });
          return next;
        });
      } else {
        try {
          await baseApi.post(
            `articles/${id}/scraps`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch {
          await baseApi.post(`articles/${id}/scraps`, null, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        setScrapCount((prev) => {
          const next = prev + 1;
          setIsScraped(next > 0);
          patchArticleCache(id, { isScraped: next > 0, scrapCount: next });
          return next;
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || "";

      if (status === 401) {
        alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
        return;
      }
      if (status === 400) {
        if (!isScraped && /이미\s*스크랩/i.test(message)) {
          try {
            await baseApi.delete(`articles/${id}/scraps`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setScrapCount((prev) => {
              const next = Math.max(0, prev - 1);
              setIsScraped(next > 0);
              patchArticleCache(id, { isScraped: next > 0, scrapCount: next });
              return next;
            });
            return;
          } catch {}
        }
        if (isScraped && /스크랩하지\s*않은/i.test(message)) {
          setScrapCount((prev) => {
            const next = Math.max(0, prev - 1);
            setIsScraped(next > 0);
            patchArticleCache(id, { isScraped: next > 0, scrapCount: next });
            return next;
          });
          return;
        }
        alert("잘못된 요청입니다. 다시 시도해주세요.");
        return;
      }
      if (status === 409) {
        alert("이미 스크랩된 게시글입니다.");
        setIsScraped(true);
        patchArticleCache(id, { isScraped: true });
        return;
      }

      alert("스크랩 처리 중 오류가 발생했습니다.");
    }
  };

  const getCoordsFromAddress = (address) =>
    new Promise((resolve, reject) => {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(address, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const { y: lat, x: lng } = result[0];
          resolve({ lat: parseFloat(lat), lng: parseFloat(lng) });
        } else reject(new Error("주소 변환 실패"));
      });
    });

  useEffect(() => {
    const fetchPostAndRoute = async () => {
      try {
        setLoading(true);
        const token =
          sessionStorage.getItem("accessToken") ||
          localStorage.getItem("accessToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [postResponse, userResponse] = await Promise.all([
          baseApi.get(`articles/${id}`, { headers }),
          token
            ? baseApi.get("/user/me", { headers }).catch(() => null)
            : Promise.resolve(null),
        ]);

        const postData = postResponse.data?.data;
        const userData = userResponse?.data?.data || userResponse?.data;
        if (userData) setCurrentUser(userData);

        const like0 = Number(postData?.likeCount || 0);
        const scrap0 = Number(postData?.scrapCount || 0);
        const liked0 = !!postData?.isLiked;
        const scraped0 = !!postData?.isScraped;

        setLikeCount(like0);
        setScrapCount(scrap0);
        setIsLiked(typeof postData?.isLiked === "boolean" ? liked0 : like0 > 0);
        setIsScraped(
          typeof postData?.isScraped === "boolean" ? scraped0 : scrap0 > 0
        );

        patchArticleCache(id, {
          isLiked: typeof postData?.isLiked === "boolean" ? liked0 : like0 > 0,
          isScraped:
            typeof postData?.isScraped === "boolean" ? scraped0 : scrap0 > 0,
          likeCount: like0,
          scrapCount: scrap0,
        });

        let placesWithCoords = postData.places;
        if (postData?.places?.length) {
          placesWithCoords = await Promise.all(
            postData.places.map(async (p) => {
              if (!p.address) return p;
              const geocoder = new window.kakao.maps.services.Geocoder();
              return new Promise((resolve) => {
                geocoder.addressSearch(p.address, (result, status) => {
                  if (status === window.kakao.maps.services.Status.OK) {
                    const { y: lat, x: lng } = result[0];
                    resolve({
                      ...p,
                      lat: parseFloat(lat),
                      lng: parseFloat(lng),
                    });
                  } else resolve(p);
                });
              });
            })
          );
        }

        setPost({ ...postData, places: placesWithCoords });

        if (placesWithCoords?.length && mapRef?.current?.getRoute) {
          await mapRef.current.getRoute(placesWithCoords);
        }
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401)
          setError("로그인이 필요하거나 권한이 없습니다.");
        else if (err.response?.status === 404)
          setError("게시글을 찾을 수 없습니다.");
        else setError("게시글을 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchPostAndRoute();
  }, [id, mapRef]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>{error}</div>;
  if (!post) return <div>게시글을 찾을 수 없습니다.</div>;

  return (
    <div className="post-course-page">
      <button
        className="back-button"
        onClick={handleGoBack}
        aria-label="뒤로 가기"
      >
        <FaArrowLeft />
      </button>

      <div className="course-header">
        <h2>{post.region}</h2>
        <h1>{post.title}</h1>
        <p className="date">{post.createdAt?.slice(0, 10)}</p>
      </div>

      <div className="stats">
        <div
          className={`stat-box bookmark-box ${isScraped ? "active" : ""}`}
          onClick={handleScrapToggle}
        >
          <FaBookmark />
          <span>{scrapCount.toLocaleString()}</span>
        </div>
        <div
          className={`stat-box heart-box ${isLiked ? "active" : ""}`}
          onClick={handleLikeToggle}
        >
          <FaHeart />
          <span>{likeCount.toLocaleString()}</span>
        </div>
      </div>

      {/* 태그와 수정 버튼 영역 (오른쪽에 연필 버튼) */}
      <div className="tags-section">
        <div className="tags">
          {post.tags?.map((tag, i) => {
            const value = typeof tag === "string" ? tag.replace(/^#/, "") : tag;
            const label = TAG_LABELS[value] || value;
            return (
              <button key={i} className="tag-btn">
                #{label}
              </button>
            );
          })}
        </div>

        {isAuthor && (
          <button
            className="edit-btn-small"
            onClick={handleEditClick}
            title="게시글 수정"
            aria-label="게시글 수정"
          >
            수정
          </button>
        )}
      </div>

      <div className="course-summary">
        {post.places?.map((place, index) => (
          <div className="course-step" key={index}>
            <div className="step-number">{place.placeOrder}</div>
            <div className="step-info">
              <div className="step-info-title">{place.placeName}</div>
              <div className="step-info-sub">{place.address}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="course-detail">
        {post.places?.map((place, index) => (
          <div className="course-detail-item" key={index}>
            <div className="detail-title">
              <div className="step-number">{place.placeOrder}</div>
              {place.placeName}
            </div>
            <div className="detail-sub">{place.address}</div>
            <img
              className="detail-img"
              src={place.photoUrl || "/default-image.png"}
              alt={`${place.placeName} 이미지`}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/default-image.png";
              }}
            />
            <div className="detail-text">{place.description}</div>
          </div>
        ))}
      </div>

      <Mapview ref={mapRef} />
    </div>
  );
};

export default PostCoursePage;
