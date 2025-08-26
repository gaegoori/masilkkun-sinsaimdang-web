import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PostCreatePage.css";
import baseApi from "../api/baseApi";

const PostCreatePage = ({ mapRef }) => {
  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("");
  const [tags, setTags] = useState([]);
  const [places, setPlaces] = useState([
    { placeName: "", address: null, image: null, description: "" },
  ]);
  const [activePlaceIndex, setActivePlaceIndex] = useState(null);
  const navigate = useNavigate();
  const tagOptions = ["여행지", "맛집", "카페"];

  useEffect(() => {
    const tempPost = localStorage.getItem("tempPost");
    if (tempPost) {
      const parsed = JSON.parse(tempPost);
      setTitle(parsed.title || "");
      setRegion(parsed.region || "");
      setTags(parsed.tags || []);
      setPlaces(
        parsed.places || [
          { placeName: "", address: null, image: null, description: "" },
        ]
      );
    }
  }, []);

  const toggleTag = (tag) => {
    setTags(
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    );
  };

  const handleImageUpload = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하만 업로드 가능합니다.");
      return;
    }
    const updated = [...places];
    updated[index].image = URL.createObjectURL(file);
    updated[index].imageFile = file;
    setPlaces(updated);
  };

  const handleDescriptionChange = (index, value) => {
    const updated = [...places];
    updated[index].description = value;
    setPlaces(updated);
  };

  const handlePlaceNameChange = (index, value) => {
    const updated = [...places];
    updated[index].placeName = value;
    setPlaces(updated);
  };

  const handleAddPlace = () => {
    setPlaces([
      ...places,
      { placeName: "", address: null, image: null, description: "" },
    ]);
  };

  const handleRemovePlace = (index) => {
    if (places.length > 1) setPlaces(places.filter((_, i) => i !== index));
  };

  const handleTempSave = () => {
    localStorage.setItem(
      "tempPost",
      JSON.stringify({ title, region, tags, places })
    );
    alert("임시 저장되었습니다!");
  };

  const validateForm = () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return false;
    }
    if (tags.length === 0) {
      alert("최소 하나의 태그를 선택해주세요.");
      return false;
    }
    if (places.some((p) => !p.placeName.trim())) {
      alert("모든 장소의 이름을 입력해주세요.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const postData = {
      title,
      content: places.map((p) => p.description).join("\n\n"),
      tags,
      places: places.map((p, i) => ({
        placeOrder: i + 1,
        placeName: p.placeName,
        description: p.description,
        photoUrl: p.image || null,
        roadAddress: p.address || null,
      })),
    };

    try {
      await baseApi.post("/articles", postData);
      localStorage.removeItem("tempPost");
      alert("게시글이 성공적으로 등록되었습니다!");
      navigate("/");
    } catch (error) {
      console.error("게시글 등록 실패:", error);
      alert("게시글 등록에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleLocationClick = (index) => {
    setActivePlaceIndex(index);
    if (mapRef.current) {
      mapRef.current.openSearch();
      mapRef.current.setOnSelectPlace((place) => {
        const updated = [...places];
        updated[index] = {
          ...updated[index],
          placeName: place.placeName,
          address: place.address,
        };
        setPlaces(updated);
      });
    }
  };

  return (
    <div className="post-create-container">
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
              key={tag}
              className={`tag-select-chip ${
                tags.includes(tag) ? "selected" : ""
              }`}
              onClick={() => toggleTag(tag)}
              type="button"
            >
              {tag}
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

            <input
              type="text"
              placeholder="장소 이름"
              className="place-name-input"
              value={place.placeName}
              onChange={(e) => handlePlaceNameChange(index, e.target.value)}
              maxLength={50}
            />

            <button
              className="location-select-btn"
              type="button"
              onClick={() => handleLocationClick(index)}
            >
              위치 등록
            </button>

            {place.address && (
              <div className="selected-address">
                주소: {place.address} <br />
              </div>
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
        <button className="submit-btn" onClick={handleSubmit} type="button">
          게시
        </button>
      </div>
    </div>
  );
};

export default PostCreatePage;
