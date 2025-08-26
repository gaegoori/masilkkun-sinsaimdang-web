// src/pages/PostEditPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./PostCreatePage.css";
import baseApi from "../api/baseApi";

// 미리보기용: 상대경로 → 절대경로 보정 (이미지 표시 전용)
const API_BASE = (
  import.meta.env.VITE_FILE_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ""
).replace(/\/$/, "");
const normalizeImageUrl = (u) => {
  if (!u) return null;
  const s = String(u);
  if (/^(blob:|data:|https?:\/\/)/i.test(s)) return s;
  return `${API_BASE}/${s.replace(/^\/+/, "")}`;
};

// 주소 → 지역 추출
const pickRegionFrom = (roadAddress, addressStr) => {
  try {
    if (roadAddress?.region_2depth_name) return roadAddress.region_2depth_name;
    if (typeof addressStr === "string" && addressStr.trim()) {
      const parts = addressStr.trim().split(/\s+/);
      if (parts[1]) return parts[1];
    }
  } catch {}
  return "";
};

const PostEditPage = ({ mapRef }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState([]);
  const [region, setRegion] = useState("");

  // ✅ places에 서버 원문 photoUrl을 별도 보관: photoUrlRaw
  const [places, setPlaces] = useState([
    {
      placeName: "",
      address: null,
      roadAddress: null,
      image: null, // 미리보기용 URL(absolute)
      imageFile: null, // 새로 업로드한 파일(있을 때만)
      photoUrlRaw: null, // ✅ 서버가 내려준 원문 photoUrl(문자열 그대로)
      description: "",
    },
  ]);

  const [activePlaceIndex, setActivePlaceIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const geocoderRef = useRef(null);

  const tagOptions = [
    { label: "여행지", value: "TRAVEL_SPOT" },
    { label: "맛집", value: "RESTAURANT" },
    { label: "카페", value: "CAFE" },
  ];

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

  // ========= 게시글 로드 =========
  useEffect(() => {
    const loadPostData = async () => {
      try {
        setLoading(true);

        const [userResponse, postResponse] = await Promise.all([
          baseApi.get("/user/me"),
          baseApi.get(`/articles/${id}`),
        ]);

        const userData = userResponse.data?.data || userResponse.data;
        const postData = postResponse.data?.data || postResponse.data;
        setCurrentUser(userData);

        const isAuthor =
          userData &&
          postData &&
          (userData.id === postData.authorId ||
            userData.id === postData.author?.id ||
            userData.id === postData.userId);

        if (!isAuthor) {
          alert("본인이 작성한 게시글만 수정할 수 있습니다.");
          navigate(`/post/${id}`);
          return;
        }

        setTitle(postData.title || "");
        setRegion(postData.region || "");

        // 태그
        const formattedTags = (postData.tags || []).map((tag) => {
          const tagObj = tagOptions.find((option) => option.value === tag);
          return tagObj || { label: tag, value: tag };
        });
        setTags(formattedTags);

        // ===== 장소 + 이미지 =====
        const formattedPlaces = (postData.places || []).map((p) => {
          // ✅ 서버 원문 photoUrl 그대로 보관(문자열 or null)
          const raw =
            (Array.isArray(p.photoUrl) ? p.photoUrl[0] : p.photoUrl) || null;

          // 미리보기용은 보정해서 절대경로(사용자에게 보여주기 위함)
          const preview = raw ? normalizeImageUrl(raw) : null;

          return {
            placeName: p.placeName || "",
            address: p.address || p.roadAddress?.address_name || null,
            roadAddress: p.roadAddress || null,
            image: preview, // 미리보기
            imageFile: null, // 새 업로드 없으면 null
            photoUrlRaw: raw, // ✅ 서버 원문 그대로 저장
            description: p.description || "",
          };
        });

        if (!postData.region && formattedPlaces.length) {
          const r = pickRegionFrom(
            formattedPlaces[0].roadAddress,
            formattedPlaces[0].address
          );
          setRegion(r || "");
        }

        if (formattedPlaces.length === 0) {
          formattedPlaces.push({
            placeName: "",
            address: null,
            roadAddress: null,
            image: null,
            imageFile: null,
            photoUrlRaw: null,
            description: "",
          });
        }
        setPlaces(formattedPlaces);
      } catch (error) {
        if (error.response?.status === 401) {
          alert("로그인이 필요합니다.");
          navigate("/login");
          return;
        }
        console.error("게시글 로드 실패:", error);
        if (error.response?.status === 404) alert("게시글을 찾을 수 없습니다.");
        else if (error.response?.status === 403) alert("권한이 없습니다.");
        else alert("게시글을 불러오는데 실패했습니다.");
        navigate(`/post/${id}`);
      } finally {
        setLoading(false);
      }
    };

    if (id) loadPostData();
  }, [id, navigate]);

  // ========= 입력 =========
  const toggleTag = (tag) => {
    setTags((prev) =>
      prev.some((t) => t.value === tag.value)
        ? prev.filter((t) => t.value !== tag.value)
        : [...prev, tag]
    );
  };

  const handleImageUpload = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024)
      return alert("파일 크기는 5MB 이하만 가능합니다.");
    const updated = [...places];
    updated[index].image = URL.createObjectURL(file); // 미리보기
    updated[index].imageFile = file; // 전송용 파일
    setPlaces(updated);
  };

  const handlePlaceNameChange = (index, value) => {
    const updated = [...places];
    updated[index].placeName = value;
    setPlaces(updated);
  };
  const handleDescriptionChange = (index, value) => {
    const updated = [...places];
    updated[index].description = value;
    setPlaces(updated);
  };

  const handleAddPlace = () =>
    setPlaces([
      ...places,
      {
        placeName: "",
        address: null,
        roadAddress: null,
        image: null,
        imageFile: null,
        photoUrlRaw: null, // ✅
        description: "",
      },
    ]);

  const handleRemovePlace = (index) =>
    places.length > 1 && setPlaces(places.filter((_, i) => i !== index));

  const handleTempSave = () => {
    localStorage.setItem(
      `tempPost_edit_${id}`,
      JSON.stringify({ title, tags, region, places })
    );
    alert("임시 저장되었습니다!");
  };

  const validateForm = () => {
    if (!title.trim()) return alert("제목을 입력해주세요."), false;
    if (tags.length === 0)
      return alert("최소 하나의 태그를 선택해주세요."), false;
    if (places.some((p) => !p.placeName.trim()))
      return alert("모든 장소의 이름을 입력해주세요."), false;

    const finalRegion =
      region ||
      pickRegionFrom(places[0]?.roadAddress, places[0]?.address) ||
      "";
    if (!finalRegion) return alert("지역을 확인해주세요."), false;

    return true;
  };

  // ========= 저장 =========
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const finalRegion =
      region ||
      pickRegionFrom(places[0]?.roadAddress, places[0]?.address) ||
      "";

    // ✅ 핵심: 새 파일이 없는 곳은 서버 원문 photoUrlRaw 를 그대로 photoUrl로 보냄
    const postDataBase = {
      title,
      content: places.map((p) => p.description).join("\n\n"),
      region: finalRegion,
      tags: tags.map((t) => t.value || t),
      places: places.map((p, i) => {
        const base = {
          placeOrder: i + 1,
          placeName: p.placeName,
          description: p.description,
          roadAddress: p.roadAddress || {
            address_name: "",
            region_1depth_name: "",
            region_2depth_name: "",
          },
        };
        if (!p.imageFile) {
          // 서버가 기존 값 유지하도록 정확히 같은 문자열을 보냄
          if (p.photoUrlRaw) base.photoUrl = p.photoUrlRaw;
          // 아무 값도 없으면 필드 자체 생략 → 서버 정책에 따라 유지/무시
        }
        return base;
      }),
    };

    const hasNewImages = places.some((p) => p.imageFile);

    try {
      if (hasNewImages) {
        const fd = new FormData();
        fd.append(
          "request",
          new Blob([JSON.stringify(postDataBase)], {
            type: "application/json",
          })
        );
        places.forEach((p, i) => {
          if (p.imageFile) {
            fd.append(
              "photos",
              p.imageFile,
              p.imageFile.name || `photo-${i + 1}`
            );
            fd.append("photoPlaceOrders", String(i + 1));
          }
        });
        await baseApi.put(`/articles/${id}`, fd);
      } else {
        await baseApi.put(`/articles/${id}`, postDataBase, {
          headers: { "Content-Type": "application/json" },
        });
      }

      alert("게시글이 성공적으로 수정되었습니다!");
      localStorage.removeItem(`tempPost_edit_${id}`);
      navigate(`/post/${id}`);
    } catch (err) {
      // 호환 필드(images / imagePlaceOrders) 재시도
      if (hasNewImages) {
        try {
          const fd2 = new FormData();
          fd2.append(
            "request",
            new Blob([JSON.stringify(postDataBase)], {
              type: "application/json",
            })
          );
          places.forEach((p, i) => {
            if (p.imageFile) {
              fd2.append(
                "images",
                p.imageFile,
                p.imageFile.name || `image-${i + 1}`
              );
              fd2.append("imagePlaceOrders", String(i + 1));
            }
          });

          await baseApi.put(`/articles/${id}`, fd2);

          alert("게시글이 성공적으로 수정되었습니다! (호환 필드 사용)");
          localStorage.removeItem(`tempPost_edit_${id}`);
          navigate(`/post/${id}`);
          return;
        } catch (err2) {
          console.error("재시도 실패:", err2?.response?.data || err2);
        }
      }

      console.error("게시글 수정 실패:", err?.response?.data || err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "게시글 수정에 실패했습니다. 다시 시도해주세요.";
      if (err?.response?.status === 401) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }
      alert(msg);
    }
  };

  // ========= 지도에서 장소 선택 =========
  const handleLocationClick = (index) => {
    setActivePlaceIndex(index);
    if (mapRef?.current) {
      mapRef.current.openSearch();
      mapRef.current.setOnSelectPlace((place) => {
        try {
          if (!place.placeName || !place.address)
            throw new Error("선택한 장소에 주소 정보가 없습니다.");
          const [region1, region2] = place.address.split(" ");
          const updated = [...places];
          updated[index] = {
            ...updated[index],
            placeName: place.placeName,
            address: place.address,
            roadAddress: {
              address_name: place.address,
              region_1depth_name: regionMap[region1] || region1,
              region_2depth_name: region2 || "",
            },
          };
          setPlaces(updated);

          const nextRegion = pickRegionFrom(
            updated[index].roadAddress,
            updated[index].address
          );
          if (nextRegion) setRegion(nextRegion);
        } catch (err) {
          console.error("주소 처리 실패:", err);
          alert(err.message);
        }
      });
    }
  };

  const handleCancel = () => {
    const hasChanges =
      title !== "" ||
      tags.length > 0 ||
      region !== "" ||
      places.some((p) => p.placeName || p.description || p.imageFile);
    if (
      hasChanges &&
      !window.confirm("수정 중인 내용이 있습니다. 정말 나가시겠습니까?")
    )
      return;
    navigate(`/post/${id}`);
  };

  if (loading) {
    return (
      <div className="post-create-container">
        <div className="loading-message">게시글을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="post-create-container">
      <div className="page-header">
        <h3 style={{ textAlign: "center" }}>게시글 수정</h3>
      </div>

      <div className="post-create-content">
        <input
          type="text"
          placeholder="제목을 입력해주세요."
          className="post-create-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
        />

        {/* region은 UI에 노출하지 않아도 되면 숨김 */}
        <div style={{ display: "none" }}>
          <input value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>

        <div className="tag-select-container">
          {tagOptions.map((tag) => (
            <button
              key={tag.value}
              className={`tag-select-chip ${
                tags.some((t) => t.value === tag.value) ? "selected" : ""
              }`}
              onClick={() => toggleTag(tag)}
              type="button"
            >
              {tag.label}
            </button>
          ))}
        </div>

        {places.map((place, index) => (
          <div className="place-section" key={index}>
            <div className="place-header">
              <div className="place-number">{index + 1}</div>
              <span className="place-title">장소 정보를 입력해주세요.</span>
              {places.length > 1 && (
                <button
                  className="place-remove-btn"
                  onClick={() => handleRemovePlace(index)}
                  type="button"
                >
                  ×
                </button>
              )}
            </div>

            {/* 장소 이름 */}
            <input
              className="place-name-input"
              maxLength={50}
              placeholder="장소 이름"
              value={place.placeName}
              onChange={(e) => handlePlaceNameChange(index, e.target.value)}
            />

            <button
              className="location-select-btn"
              type="button"
              onClick={() => handleLocationClick(index)}
            >
              위치 등록
            </button>

            {place.address && (
              <div className="selected-address">주소: {place.address}</div>
            )}

            {/* 이미지 업로드/미리보기 */}
            <div className="image-upload-section">
              <label
                htmlFor={`imageUpload-${index}`}
                className="image-upload-label"
              >
                <div className="image-upload-placeholder">
                  {place.image ? (
                    <img
                      src={place.image}
                      alt="미리보기"
                      className="uploaded-image"
                      onError={() =>
                        console.warn("이미지 로드 실패:", place.image)
                      }
                    />
                  ) : (
                    <>
                      <div className="image-icon">📷</div>
                      <span>사진을 업로드해주세요.</span>
                    </>
                  )}
                </div>
              </label>
              <input
                id={`imageUpload-${index}`}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(index, e)}
                style={{ display: "none" }}
              />
            </div>

            <textarea
              className="place-description-input"
              placeholder="설명을 작성해주세요."
              value={place.description}
              onChange={(e) => handleDescriptionChange(index, e.target.value)}
              maxLength={500}
              rows={4}
            />
          </div>
        ))}

        <button
          className="add-place-btn"
          onClick={handleAddPlace}
          type="button"
        >
          + 장소 추가
        </button>
      </div>

      <div className="post-create-footer">
        <button className="temp-save-btn" onClick={handleCancel} type="button">
          취소
        </button>
        <button className="submit-btn" onClick={handleSubmit} type="button">
          수정완료
        </button>
      </div>
    </div>
  );
};

export default PostEditPage;
