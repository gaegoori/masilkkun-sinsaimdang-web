import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./PostCreatePage.css"; // 똑같은 CSS 사용
import baseApi from "../api/baseApi";

const PostEditPage = ({ mapRef }) => {
  const { id } = useParams(); // URL에서 게시글 ID 가져오기
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState([]);
  const [places, setPlaces] = useState([
    {
      placeName: "",
      address: null,
      roadAddress: null,
      image: null,
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

  // 기존 게시글 데이터 불러오기
  useEffect(() => {
    const loadPostData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");

        if (!token) {
          alert("로그인이 필요합니다.");
          navigate("/login");
          return;
        }

        // 현재 사용자 정보와 게시글 정보를 동시에 가져오기
        const [userResponse, postResponse] = await Promise.all([
          baseApi.get("/user/me", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          baseApi.get(`/articles/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const userData = userResponse.data?.data || userResponse.data;
        const postData = postResponse.data?.data || postResponse.data;

        setCurrentUser(userData);

        // 작성자 권한 확인
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

        // 기존 데이터를 폼에 설정
        setTitle(postData.title || "");

        // 태그 데이터 변환 (문자열을 객체로)
        const formattedTags = (postData.tags || []).map((tag) => {
          const tagObj = tagOptions.find((option) => option.value === tag);
          return tagObj || { label: tag, value: tag };
        });
        setTags(formattedTags);

        // 장소 데이터 변환
        const formattedPlaces = (postData.places || []).map((place) => ({
          placeName: place.placeName || "",
          address: place.address || place.roadAddress?.address_name || null,
          roadAddress: place.roadAddress || null,
          image: place.photoUrl || null, // 기존 이미지 URL
          description: place.description || "",
          imageFile: null, // 새로 업로드할 파일은 null로 시작
        }));

        // 최소 1개 장소는 보장
        if (formattedPlaces.length === 0) {
          formattedPlaces.push({
            placeName: "",
            address: null,
            roadAddress: null,
            image: null,
            description: "",
          });
        }

        setPlaces(formattedPlaces);
      } catch (error) {
        console.error("게시글 로드 실패:", error);
        if (error.response?.status === 404) {
          alert("게시글을 찾을 수 없습니다.");
        } else if (error.response?.status === 403) {
          alert("권한이 없습니다.");
        } else {
          alert("게시글을 불러오는데 실패했습니다.");
        }
        navigate(`/post/${id}`);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPostData();
    }
  }, [id, navigate]);

  // Kakao Geocoder 초기화
  const initGeocoder = () => {
    return new Promise((resolve, reject) => {
      if (geocoderRef.current) return resolve(geocoderRef.current);
      const check = setInterval(() => {
        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
          geocoderRef.current = new window.kakao.maps.services.Geocoder();
          clearInterval(check);
          resolve(geocoderRef.current);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        reject(new Error("Kakao Maps 스크립트 로딩 실패"));
      }, 5000);
    });
  };

  // 좌표 → 주소 변환
  const coordsToAddress = async (lat, lng) => {
    await initGeocoder();
    return new Promise((resolve, reject) => {
      geocoderRef.current.coord2Address(lng, lat, (result, status) => {
        if (
          status === window.kakao.maps.services.Status.OK &&
          result.length > 0
        ) {
          const roadAddress = result[0].road_address;
          const jibunAddress = result[0].address;
          const address = roadAddress || jibunAddress;
          if (!address)
            return reject(new Error("주소 정보를 찾을 수 없습니다."));

          resolve({
            address_name: address.address_name,
            region_1depth_name:
              regionMap[address.region_1depth_name] ||
              address.region_1depth_name,
            region_2depth_name: address.region_2depth_name,
          });
        } else {
          reject(
            new Error("주소 변환에 실패했습니다. (해당 좌표에 주소 없음)")
          );
        }
      });
    });
  };

  // 태그 선택 토글
  const toggleTag = (tag) => {
    setTags((prev) =>
      prev.some((t) => t.value === tag.value)
        ? prev.filter((t) => t.value !== tag.value)
        : [...prev, tag]
    );
  };

  // 이미지 업로드
  const handleImageUpload = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024)
      return alert("파일 크기는 5MB 이하만 가능합니다.");
    const updated = [...places];
    updated[index].image = URL.createObjectURL(file);
    updated[index].imageFile = file;
    setPlaces(updated);
  };

  // 장소 이름 / 설명 변경
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

  // 장소 추가/삭제
  const handleAddPlace = () =>
    setPlaces([
      ...places,
      {
        placeName: "",
        address: null,
        roadAddress: null,
        image: null,
        description: "",
      },
    ]);
  const handleRemovePlace = (index) =>
    places.length > 1 && setPlaces(places.filter((_, i) => i !== index));

  // 임시저장
  const handleTempSave = () => {
    localStorage.setItem(
      `tempPost_edit_${id}`,
      JSON.stringify({ title, tags, places })
    );
    alert("임시 저장되었습니다!");
  };

  // 폼 유효성 체크
  const validateForm = () => {
    if (!title.trim()) return alert("제목을 입력해주세요."), false;
    if (tags.length === 0)
      return alert("최소 하나의 태그를 선택해주세요."), false;
    if (places.some((p) => !p.placeName.trim()))
      return alert("모든 장소의 이름을 입력해주세요."), false;
    return true;
  };

  // 수정 완료
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const postData = {
        title,
        content: places.map((p) => p.description).join("\n\n"),
        tags: tags.map((t) => t.value || t),
        places: places.map((p, i) => ({
          placeOrder: i + 1,
          placeName: p.placeName,
          description: p.description,
          roadAddress: p.roadAddress || {
            address_name: "",
            region_1depth_name: "",
            region_2depth_name: "",
          },
        })),
      };

      const token = localStorage.getItem("accessToken");

      // FormData 생성 (새로 업로드된 이미지가 있을 경우에만)
      const hasNewImages = places.some((p) => p.imageFile);

      let response;
      if (hasNewImages) {
        const formData = new FormData();
        formData.append(
          "request",
          new Blob([JSON.stringify(postData)], { type: "application/json" })
        );

        places.forEach((p) => {
          if (p.imageFile) {
            formData.append("images", p.imageFile);
          }
        });

        response = await baseApi.put(`/articles/${id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        // 이미지 변경이 없으면 JSON으로 전송
        response = await baseApi.put(`/articles/${id}`, postData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }

      alert("게시글이 성공적으로 수정되었습니다!");

      // 임시저장 데이터 삭제
      localStorage.removeItem(`tempPost_edit_${id}`);

      // 수정된 게시글 상세 페이지로 이동
      navigate(`/post/${id}`);
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      if (error.response?.status === 403) {
        alert("수정 권한이 없습니다.");
      } else {
        alert("게시글 수정에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  const handleLocationClick = (index) => {
    setActivePlaceIndex(index);
    if (mapRef.current) {
      mapRef.current.openSearch();
      mapRef.current.setOnSelectPlace((place) => {
        try {
          if (!place.placeName || !place.address) {
            throw new Error("선택한 장소에 주소 정보가 없습니다.");
          }

          const [region1, region2, ...rest] = place.address.split(" ");

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
        } catch (err) {
          console.error("주소 처리 실패:", err);
          alert(err.message);
        }
      });
    }
  };

  // 취소 버튼
  const handleCancel = () => {
    const hasChanges =
      title !== "" ||
      tags.length > 0 ||
      places.some((p) => p.placeName || p.description);

    if (hasChanges) {
      const confirmLeave = window.confirm(
        "수정 중인 내용이 있습니다. 정말 나가시겠습니까?"
      );
      if (!confirmLeave) return;
    }

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
            <div
              className="place-name-input"
              maxLength={50}
              placeholder="장소 이름"
              value={place.placeName}
              onChange={(e) => handlePlaceNameChange(index, e.target.value)}
            >
              장소: {place.placeName}
            </div>

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
