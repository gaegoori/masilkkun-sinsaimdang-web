import { useEffect, useState } from "react";
import "./MyPage.css";
import { FaHeart, FaBookmark } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import baseApi from "../api/baseApi";

export default function MyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState(new Set());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    nickname: "",
    profileImageUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 사용자 정보 및 게시글 로드
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 사용자 기본 정보 로드
        const userResponse = await baseApi.get("/user/me");

        // API 응답 구조에 따른 유연한 처리
        let userData = null;
        if (userResponse.data?.success) {
          userData = userResponse.data.data;
        } else if (userResponse.data?.data) {
          userData = userResponse.data.data;
        } else if (userResponse.data?.nickname) {
          userData = userResponse.data;
        }

        if (userData) {
          // 팔로워/팔로잉 숫자 정보 로드
          const followInfoResponse = await baseApi.get(
            `/user/${userData.id}/follow-info`
          );
          const followInfo =
            followInfoResponse.data?.data || followInfoResponse.data || {};

          const completeUserData = {
            ...userData,
            followerCount:
              followInfo.followerCount ?? userData.followerCount ?? 0,
            followingCount:
              followInfo.followingCount ?? userData.followingCount ?? 0,
          };

          setUser(completeUserData);
          setEditForm({
            nickname: userData.nickname || userData.name || "",
            profileImageUrl: userData.profileImageUrl || "",
          });
        } else {
          console.error("사용자 데이터를 찾을 수 없습니다");
        }

        // 사용자 게시글 로드
        try {

          let myPostsResponse;
          try {
            // 1차 시도: 작성한 게시글 API
            myPostsResponse = await baseApi.get(
              `/user/${userData.id}/articles`
            );
          } catch (articlesError) {
            // 2차 시도: 대체 엔드포인트들
            const alternativeEndpoints = [
              `/user/me/articles`,
              `/user/me/posts`,
              `/user/${userData.id}/posts`,
            ];

            let success = false;
            for (const endpoint of alternativeEndpoints) {
              try {
                myPostsResponse = await baseApi.get(endpoint);
                success = true;
                break;
              } catch (altError) {
                // 계속 시도
              }
            }

            if (!success) {
              throw articlesError;
            }
          }

          const normalizedPosts =
            (Array.isArray(myPostsResponse.data?.data?.content) &&
              myPostsResponse.data.data.content) ||
            (Array.isArray(myPostsResponse.data?.content) &&
              myPostsResponse.data.content) ||
            (Array.isArray(myPostsResponse.data?.data) &&
              myPostsResponse.data.data) ||
            (Array.isArray(myPostsResponse.data) && myPostsResponse.data) ||
            [];

          setPosts(normalizedPosts);
        } catch (postsError) {
          console.error("게시글 로드 실패:", postsError);
          setPosts([]);
        }
      } catch (e) {
        console.error("사용자 정보 로드 실패:", e);
        setError("사용자 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 팔로우 데이터 로드 함수
  const loadFollowDataAlternative = async (type) => {
    if (!user?.id) {
      setError("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let endpoint;
      if (type === "followers") {
        endpoint = `/user/${user.id}/followers`;
      } else {
        endpoint = `/user/${user.id}/followings`;
      }

      // 1차 시도: 기본 엔드포인트
      let response;
      try {
        response = await baseApi.get(endpoint);
      } catch (primaryError) {
        // 2차 시도: 다른 엔드포인트 패턴들
        const alternativeEndpoints = [
          `/users/${user.id}/${type}`,
          `/follow/${user.id}/${type}`,
          `/${type}/${user.id}`,
          `/user/me/${type}`,
        ];

        let successfulResponse = null;
        for (const altEndpoint of alternativeEndpoints) {
          try {
            successfulResponse = await baseApi.get(altEndpoint);
            response = successfulResponse;
            break;
          } catch (altError) {
            // 계속 시도
          }
        }

        if (!successfulResponse) {
          throw primaryError;
        }
      }

      // 응답 데이터 처리
      if (response && response.data) {
        if (response.data.success === false) {
          throw new Error(
            response.data.message || "서버에서 오류를 반환했습니다."
          );
        }

        if (type === "followers") {
          const followersData =
            response.data?.data?.content ||
            response.data?.data ||
            response.data?.followers ||
            response.data ||
            [];
          setFollowers(Array.isArray(followersData) ? followersData : []);
        } else {
          const followingData =
            response.data?.data?.content ||
            response.data?.data ||
            response.data?.following ||
            response.data ||
            [];
          const followingArray = Array.isArray(followingData)
            ? followingData
            : [];
          setFollowing(followingArray);
          setFollowingUsers(new Set(followingArray.map((u) => u.id)));
        }
      }
    } catch (e) {
      console.error(`${type} 데이터 로드 실패:`, e);

      // 빈 배열로 설정
      if (type === "followers") {
        setFollowers([]);
      } else {
        setFollowing([]);
        setFollowingUsers(new Set());
      }

      // 사용자 친화적 에러 메시지
      if (e.response?.status === 500) {
        setError(
          `현재 서버에 문제가 있어 ${
            type === "followers" ? "팔로워" : "팔로잉"
          } 목록을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`
        );
      } else if (e.response?.status === 404) {
        setError(
          `${
            type === "followers" ? "팔로워" : "팔로잉"
          } 기능이 아직 구현되지 않았습니다.`
        );
      } else {
        setError(
          `${
            type === "followers" ? "팔로워" : "팔로잉"
          } 목록을 불러오는데 실패했습니다.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFollowData = loadFollowDataAlternative;

  // 팔로우 정보 새로고침
  const refreshFollowInfo = async () => {
    if (!user?.id) return;
    try {
      const followInfoResponse = await baseApi.get(
        `/user/${user.id}/follow-info`
      );
      const followInfo =
        followInfoResponse.data?.data || followInfoResponse.data || {};
      setUser((prev) => ({
        ...prev,
        followerCount: followInfo.followerCount ?? prev.followerCount ?? 0,
        followingCount: followInfo.followingCount ?? prev.followingCount ?? 0,
      }));
    } catch (e) {
      console.error("팔로우 정보 새로고침 실패:", e);
    }
  };

  // 팔로우/언팔로우 처리
  const handleFollow = async (userId) => {
    try {
      const isCurrentlyFollowing = followingUsers.has(userId);
      const response = await baseApi.post(`/user/${userId}/follow`);

      if (response.data?.success) {
        setFollowingUsers((prev) => {
          const s = new Set(prev);
          isCurrentlyFollowing ? s.delete(userId) : s.add(userId);
          return s;
        });

        await refreshFollowInfo();

        if (showModal) {
          await loadFollowData(modalType);
        }
      }
    } catch (e) {
      console.error("팔로우/언팔로우 실패:", e);
      setError("팔로우 처리 중 오류가 발생했습니다.");
    }
  };

  const openModal = async (type) => {
    setModalType(type);
    setShowModal(true);
    loadFollowData(type).catch(console.error);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType("");
    setError(null);
    setLoading(false);
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode((v) => !v);
    setSelectedPosts(new Set());
  };

  const togglePostSelection = (postId) => {
    setSelectedPosts((prev) => {
      const s = new Set(prev);
      s.has(postId) ? s.delete(postId) : s.add(postId);
      return s;
    });
  };

  // 게시글 삭제
  const deletePosts = async () => {
    if (selectedPosts.size === 0) {
      setError("삭제할 게시글을 선택해주세요.");
      return;
    }

    const confirmDelete = window.confirm(
      `선택한 ${selectedPosts.size}개의 게시글을 정말 삭제하시겠습니까?`
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);
      setError(null);

      // 현재는 서버 문제로 삭제 불가 안내
      setError(
        `⚠️ 현재 서버에 문제가 있어 게시글 삭제 기능을 사용할 수 없습니다.\n\n` +
          `개발팀에서 해결 중이니 잠시 후 다시 시도해주세요.`
      );

      setSelectedPosts(new Set());
      setIsDeleteMode(false);
    } catch (e) {
      console.error("게시글 삭제 실패:", e);
      setError("현재 서버 문제로 게시글 삭제가 불가능합니다.");
    } finally {
      setLoading(false);
    }
  };

  const openProfileEdit = () => {
    setIsEditingProfile(true);
    setEditForm({
      nickname: user?.nickname || "",
      profileImageUrl: user?.profileImageUrl || "",
    });
    setError(null);
  };

  const closeProfileEdit = () => {
    setEditForm({
      nickname: user?.nickname || "",
      profileImageUrl: user?.profileImageUrl || "",
    });
    setIsEditingProfile(false);
    setError(null);
    setLoading(false);
  };

  // 프로필 저장
  const saveProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      let finalProfileImageUrl = editForm.profileImageUrl;

      // base64 데이터인 경우 (새로 업로드된 이미지)
      if (
        editForm.profileImageUrl &&
        editForm.profileImageUrl.startsWith("data:image/")
      ) {
        try {
          const formData = new FormData();
          const response = await fetch(editForm.profileImageUrl);
          const blob = await response.blob();
          formData.append("profileImage", blob, "profile.jpg");

          const uploadResponse = await baseApi.post(
            "/user/profile-image",
            formData
          );

          finalProfileImageUrl =
            uploadResponse.data?.data?.profileImageUrl ||
            uploadResponse.data?.profileImageUrl ||
            uploadResponse.data?.data?.url ||
            uploadResponse.data?.url ||
            uploadResponse.data?.imageUrl;

          if (!finalProfileImageUrl) {
            throw new Error("이미지 업로드 응답에서 URL을 찾을 수 없습니다.");
          }
        } catch (uploadError) {
          console.error("이미지 업로드 실패:", uploadError);
          setError(`이미지 업로드에 실패했습니다: ${uploadError.message}`);
          return;
        }
      }

      // 즉시 로컬 상태 업데이트
      const updatedUser = {
        ...user,
        nickname: editForm.nickname,
        profileImageUrl: finalProfileImageUrl,
      };
      setUser(updatedUser);

      // 프로필 정보 업데이트
      const updateData = {
        nickname: editForm.nickname,
        profileImageUrl: finalProfileImageUrl,
      };

      const response = await baseApi.put("/user/me", updateData);

      if (response.data?.success || response.status === 200) {
        setEditForm({
          nickname: editForm.nickname,
          profileImageUrl: finalProfileImageUrl,
        });

        setIsEditingProfile(false);

        // 사이드바 업데이트를 위한 이벤트 발생
        window.dispatchEvent(
          new CustomEvent("userProfileUpdated", {
            detail: {
              nickname: editForm.nickname,
              profileImageUrl: finalProfileImageUrl,
              user: updatedUser,
            },
          })
        );
      } else {
        setUser(user);
        setError("프로필 업데이트에 실패했습니다.");
      }
    } catch (e) {
      console.error("프로필 업데이트 실패:", e);
      setUser(user);
      setError(
        `프로필 업데이트 중 오류가 발생했습니다: ${
          e.response?.data?.message || e.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("이미지 파일은 5MB 이하여야 합니다.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setEditForm((prev) => ({
        ...prev,
        profileImageUrl: result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  const handleUserProfileClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="myp-page">
      {/* 로딩 오버레이 */}
      {loading && (
        <div className="myp-loading-overlay">
          <div>로딩 중...</div>
        </div>
      )}

      {/* 헤더 네비게이션 */}
      <div className="myp-header-nav">
        <h3 className="myp-header-title">마이페이지</h3>
      </div>

      {/* 헤더 */}
      <section className="myp-header">
        <img
          className="myp-avatar-lg"
          src={
            user?.profileImageUrl ||
            "https://www.studiopeople.kr/common/img/default_profile.png"
          }
          alt="프로필"
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
        <h1 className="myp-name">{user?.nickname}</h1>
        <button className="myp-edit-btn" onClick={openProfileEdit}>
          수정
        </button>

        <div className="myp-stats">
          <div className="myp-stat" onClick={() => openModal("followers")}>
            <div className="myp-stat-value">
              팔로워 {user?.followerCount?.toLocaleString?.() ?? "0"}
            </div>
          </div>
          <div className="myp-stat" onClick={() => openModal("following")}>
            <div className="myp-stat-value">
              팔로잉 {user?.followingCount?.toLocaleString?.() ?? "0"}
            </div>
          </div>
        </div>
      </section>

      {/* 섹션 헤더 */}
      <div className="myp-section-header">
        <h2 className="myp-section-title">내 게시글</h2>
        {!isDeleteMode ? (
          <button className="myp-edit-posts-btn" onClick={toggleDeleteMode}>
            삭제
          </button>
        ) : (
          <div className="myp-delete-actions">
            <button className="myp-cancel-btn" onClick={toggleDeleteMode}>
              취소
            </button>
            <button
              className="myp-delete-btn"
              onClick={deletePosts}
              disabled={selectedPosts.size === 0 || loading}
            >
              삭제 ({selectedPosts.size})
            </button>
          </div>
        )}
      </div>

      {/* 게시글 리스트 */}
      <div className="myp-posts">
        {posts.length === 0 ? (
          <div className="myp-no-posts">게시글이 없습니다.</div>
        ) : (
          posts.map((post) => {
            const dateStr = post?.createdAt
              ? new Date(post.createdAt).toString() !== "Invalid Date"
                ? new Date(post.createdAt).toLocaleDateString("ko-KR")
                : ""
              : "";

            return (
              <div
                key={post.id}
                className={`myp-card ${isDeleteMode ? "delete-mode" : ""} ${
                  selectedPosts.has(post.id) ? "selected" : ""
                }`}
                onClick={
                  !isDeleteMode ? () => handlePostClick(post.id) : undefined
                }
              >
                {isDeleteMode && (
                  <div className="myp-checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={selectedPosts.has(post.id)}
                      onChange={() => togglePostSelection(post.id)}
                      className="myp-checkbox"
                    />
                  </div>
                )}

                {/* 이미지 섹션 */}
                <div className="myp-card-images">
                  <img
                    src={post.places?.[0]?.photoUrl}
                    alt={`${post.title} 이미지 1`}
                    className="myp-card-image"
                  />
                  <img
                    src={post.places?.[1]?.photoUrl}
                    alt={`${post.title} 이미지 2`}
                    className="myp-card-image"
                  />
                </div>

                {/* 내용 섹션 */}
                <div className="myp-card-content">
                  <div className="myp-card-header">
                    <img
                      src={
                        post?.author?.profileImage ||
                        user?.profileImageUrl ||
                        "https://www.studiopeople.kr/common/img/default_profile.png"
                      }
                      alt={post?.author?.nickname || "작성자"}
                      className="myp-card-avatar"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        objectPosition: "center",
                      }}
                    />
                    <div className="myp-card-info">
                      <div className="myp-meta">
                        {post?.author?.nickname || user?.nickname}
                        {dateStr && ` • ${dateStr}`}
                      </div>
                      <h3 className="myp-title">{post.title}</h3>

                      <div className="myp-tags">
                        {Array.isArray(post?.tags) &&
                          post.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="myp-tag">
                              #
                              {tag === "TRAVEL"
                                ? "여행지"
                                : tag === "RESTAURANT"
                                ? "맛집"
                                : tag === "CAFE"
                                ? "카페"
                                : tag}
                            </span>
                          ))}
                      </div>

                      <div className="myp-actions">
                        <div className="myp-pill">
                          <FaBookmark className="myp-icon" />
                          <span>
                            {post?.scrapCount >= 1000
                              ? `${(post.scrapCount / 1000).toFixed(1)}K`
                              : post?.scrapCount ?? 0}
                          </span>
                        </div>
                        <div className="myp-pill">
                          <FaHeart className="myp-icon" />
                          <span>
                            {post?.likeCount >= 1000
                              ? `${(post.likeCount / 1000).toFixed(1)}K`
                              : post?.likeCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 프로필 수정 모달 */}
      {isEditingProfile && (
        <div
          className="myp-modal-overlay myp-profile-edit-modal"
          onClick={closeProfileEdit}
        >
          <div
            className="myp-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="myp-modal-header">
              <h3>프로필 수정</h3>
              <button className="myp-modal-close" onClick={closeProfileEdit}>
                ×
              </button>
            </div>
            <div className="myp-modal-body">
              <div className="myp-form-group">
                <label>프로필 이미지</label>
                <div className="myp-image-upload-section">
                  <div className="myp-current-image">
                    <img
                      src={
                        editForm.profileImageUrl ||
                        "https://www.studiopeople.kr/common/img/default_profile.png"
                      }
                      alt="프로필 미리보기"
                      className="myp-preview-image"
                      style={{
                        width: "100px",
                        height: "100px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        objectPosition: "center",
                      }}
                    />
                  </div>
                  <div className="myp-upload-buttons">
                    <input
                      type="file"
                      id="imageUpload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="myp-file-input"
                    />
                    <label htmlFor="imageUpload" className="myp-upload-btn">
                      이미지 선택
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          profileImageUrl:
                            "https://www.studiopeople.kr/common/img/default_profile.png",
                        }))
                      }
                      className="myp-default-btn"
                    >
                      기본 이미지
                    </button>
                    <input
                      type="url"
                      placeholder="또는 이미지 URL 입력"
                      value={editForm.profileImageUrl}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          profileImageUrl: e.target.value,
                        }))
                      }
                      className="myp-url-input"
                    />
                  </div>
                </div>
              </div>

              <div className="myp-form-group">
                <label htmlFor="nickname">닉네임</label>
                <input
                  type="text"
                  id="nickname"
                  name="nickname"
                  value={editForm.nickname}
                  onChange={handleInputChange}
                  className="myp-form-input"
                />
              </div>

              <div className="myp-form-actions">
                <button className="myp-cancel-btn" onClick={closeProfileEdit}>
                  취소
                </button>
                <button
                  className="myp-save-btn"
                  onClick={saveProfile}
                  disabled={loading}
                >
                  {loading ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 팔로워/팔로잉 모달 */}
      {showModal && (
        <div className="myp-modal-overlay" onClick={closeModal}>
          <div
            className="myp-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="myp-modal-header">
              <h3>{modalType === "followers" ? "팔로워" : "팔로잉"}</h3>
              <button className="myp-modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="myp-modal-body">
              {loading ? (
                <div className="myp-modal-loading">로딩 중...</div>
              ) : error ? (
                <div
                  className="myp-error-message"
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  <p>⚠️ {error}</p>
                  <button
                    onClick={() => loadFollowData(modalType)}
                    style={{
                      marginTop: "10px",
                      padding: "8px 16px",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    다시 시도
                  </button>
                </div>
              ) : (modalType === "followers" ? followers : following).length ===
                0 ? (
                <div
                  className="myp-empty-message"
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  {modalType === "followers" ? "팔로워가" : "팔로잉한 사용자가"}{" "}
                  없습니다.
                </div>
              ) : (
                (modalType === "followers" ? followers : following).map(
                  (person) => (
                    <div key={person.id} className="myp-user-item">
                      <img
                        src={
                          person.profileImageUrl ||
                          "https://www.studiopeople.kr/common/img/default_profile.png"
                        }
                        alt={person.nickname || person.name}
                        className="myp-user-avatar"
                        onClick={() => handleUserProfileClick(person.id)}
                        style={{
                          cursor: "pointer",
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          objectPosition: "center",
                        }}
                      />
                      <div className="myp-user-info">
                        <span
                          className="myp-user-name"
                          onClick={() => handleUserProfileClick(person.id)}
                          style={{ cursor: "pointer" }}
                        >
                          {person.nickname || person.name}
                        </span>
                      </div>
                      {person.id !== user?.id && (
                        <button
                          className={`myp-follow-btn ${
                            followingUsers.has(person.id) ? "following" : ""
                          }`}
                          onClick={() => handleFollow(person.id)}
                          disabled={loading}
                        >
                          {followingUsers.has(person.id) ? "팔로잉" : "팔로우"}
                        </button>
                      )}
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && !showModal && <div className="myp-error">{error}</div>}
    </div>
  );
}
