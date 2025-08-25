import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ProfilePage.css";
import { FaHeart, FaBookmark, FaArrowLeft } from "react-icons/fa";
import baseApi from "../api/baseApi";

const getFollowingsEndpoint = (uid) => `/user/${uid}/followings`;

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false); // 페이지/리스트 로딩
  const [isToggling, setIsToggling] = useState(false); // 팔로우 버튼 토글 중
  const [error, setError] = useState(null);

  // 현재 내가 상대를 팔로우 중인지 확실히 판단
  const checkIsFollowing = async (profileUserId, meId) => {
    if (!profileUserId || !meId) return false;
    try {
      const res1 = await baseApi.get(getFollowingsEndpoint(meId));
      const list1 = res1.data?.data || res1.data?.followings || res1.data || [];
      if (
        Array.isArray(list1) &&
        list1.some((u) => u.id === Number(profileUserId))
      ) {
        return true;
      }
    } catch {}
    try {
      const res2 = await baseApi.get(`/user/${profileUserId}/followers`);
      const list2 =
        res2.data?.data?.content ||
        res2.data?.data ||
        res2.data?.content ||
        res2.data?.followers ||
        res2.data ||
        [];
      if (Array.isArray(list2) && list2.some((u) => u.id === Number(meId))) {
        return true;
      }
    } catch {}
    return false;
  };

  // 사용자 정보 및 게시글 로드
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 현재 로그인한 사용자 정보
        const currentUserResponse = await baseApi.get("/user/me");
        let currentUserData = null;
        if (currentUserResponse.data?.success)
          currentUserData = currentUserResponse.data.data;
        else if (currentUserResponse.data?.data)
          currentUserData = currentUserResponse.data.data;
        else if (currentUserResponse.data?.nickname)
          currentUserData = currentUserResponse.data;
        setCurrentUser(currentUserData);

        // 프로필 사용자 정보
        let userResponse;
        try {
          userResponse = await baseApi.get(`/user/${userId}/profile`);
        } catch (profileError) {
          console.warn(
            "프로필 API 실패, 기본 사용자 API 시도:",
            profileError.response?.status
          );
          userResponse = await baseApi.get(`/user/${userId}`);
        }

        let userData = null;
        if (userResponse.data?.success) userData = userResponse.data.data;
        else if (userResponse.data?.data) userData = userResponse.data.data;
        else if (userResponse.data?.nickname) userData = userResponse.data;

        if (userData) {
          // 팔로워/팔로잉 카운트
          try {
            const followInfoResponse = await baseApi.get(
              `/user/${userData.id}/follow-info`
            );
            const followInfo =
              followInfoResponse.data?.data || followInfoResponse.data || {};
            setUser({
              ...userData,
              followerCount:
                followInfo.followerCount ?? userData.followerCount ?? 0,
              followingCount:
                followInfo.followingCount ?? userData.followingCount ?? 0,
            });
          } catch (followInfoError) {
            console.warn("팔로우 정보 로드 실패:", followInfoError);
            setUser(userData);
          }

          // 초기 팔로잉 상태 확인
          if (currentUserData && currentUserData.id !== Number(userId)) {
            const followingNow = await checkIsFollowing(
              Number(userId),
              currentUserData.id
            );
            setIsFollowing(followingNow);
          } else {
            setIsFollowing(false);
          }
        } else {
          console.error("사용자 데이터를 찾을 수 없습니다:", userResponse.data);
          setError("사용자를 찾을 수 없습니다.");
        }

        // 사용자 게시글
        try {
          const userPosts = await baseApi.get(`/user/${userId}/articles`);
          const normalizedPosts =
            (Array.isArray(userPosts.data?.data?.content) &&
              userPosts.data.data.content) ||
            (Array.isArray(userPosts.data?.content) &&
              userPosts.data.content) ||
            (Array.isArray(userPosts.data?.data) && userPosts.data.data) ||
            (Array.isArray(userPosts.data) && userPosts.data) ||
            [];
          setPosts(normalizedPosts);
        } catch (postsError) {
          console.warn("게시글 로드 실패:", postsError);
          setPosts([]);
        }
      } catch (e) {
        console.error("사용자 정보 로드 실패:", e);
        setError("사용자 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // 팔로워/팔로잉 데이터 로드
  const loadFollowData = async (type) => {
    if (!user?.id) {
      console.error("사용자 ID가 없습니다:", user);
      setError("사용자 정보를 찾을 수 없습니다.");
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const endpoint =
        type === "followers"
          ? `/user/${user.id}/followers`
          : getFollowingsEndpoint(user.id);

      let response;
      try {
        response = await baseApi.get(endpoint);
      } catch (primaryError) {
        console.warn("1차 API 호출 실패:", primaryError.response?.status);
        const alternativeEndpoints = [
          getFollowingsEndpoint(user.id),
          `/user/${user.id}/following`,
          `/users/${user.id}/${type}`,
          `/follow/${user.id}/${type}`,
          `/${type}/${user.id}`,
        ];
        let ok = null;
        for (const alt of alternativeEndpoints) {
          try {
            ok = await baseApi.get(alt);
            response = ok;
            break;
          } catch (e) {
            console.warn(`대체 API 실패 (${alt}):`, e.response?.status);
          }
        }
        if (!ok) throw primaryError;
      }

      if (response && response.data) {
        if (response.data.success === false)
          throw new Error(response.data.message || "서버 오류");

        if (type === "followers") {
          let followersData = [];
          if (Array.isArray(response.data)) followersData = response.data;
          else if (Array.isArray(response.data?.data?.content))
            followersData = response.data.data.content;
          else if (Array.isArray(response.data?.data))
            followersData = response.data.data;
          else if (Array.isArray(response.data?.content))
            followersData = response.data.content;
          else if (Array.isArray(response.data?.followers))
            followersData = response.data.followers;
          setFollowers(followersData || []);
        } else {
          let followingData = [];
          if (Array.isArray(response.data)) followingData = response.data;
          else if (Array.isArray(response.data?.data?.content))
            followingData = response.data.data.content;
          else if (Array.isArray(response.data?.data))
            followingData = response.data.data;
          else if (Array.isArray(response.data?.content))
            followingData = response.data.content;
          else if (Array.isArray(response.data?.followings))
            followingData = response.data.followings;
          else if (Array.isArray(response.data?.following))
            followingData = response.data.following;
          setFollowing(followingData || []);
          setFollowingUsers(new Set((followingData || []).map((u) => u.id)));
        }
      }
    } catch (e) {
      console.error(`${type} 데이터 로드 실패:`, e);
      if (type === "followers") setFollowers([]);
      else {
        setFollowing([]);
        setFollowingUsers(new Set());
      }
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
      } else if (e.message?.includes("서버")) {
        setError(e.message);
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

  // 팔로우 정보 새로고침 + 팔로잉 상태 재판단
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
      if (currentUser?.id && currentUser.id !== Number(userId)) {
        const followingNow = await checkIsFollowing(
          Number(userId),
          currentUser.id
        );
        setIsFollowing(followingNow);
      }
    } catch (e) {
      console.warn("팔로우 정보 새로고침 실패:", e);
    }
  };

  // 팔로우/언팔 토글 요청 (언팔은 DELETE 우선)
  async function requestFollowToggle(targetUserId, wantFollow) {
    if (wantFollow) {
      // FOLLOW: POST 계열
      try {
        const res = await baseApi.post(`/user/${targetUserId}/follow`, {});
        return res;
      } catch (eA) {
        const s = eA?.response?.status;
        if (s === 400 || s === 409) return eA.response; // 이미 팔로우 상태 → 성공 간주
        try {
          return await baseApi.post(`/follow`, { targetUserId });
        } catch (eB) {
          try {
            return await baseApi.post(`/users/${targetUserId}/follow`, {});
          } catch (eC) {
            return await baseApi.post(`/follow/${targetUserId}`, {});
          }
        }
      }
    } else {
      // UNFOLLOW: DELETE/UNFOLLOW 계열 우선
      try {
        const res = await baseApi.delete(`/user/${targetUserId}/follow`);
        return res;
      } catch (eA) {
        const s = eA?.response?.status;
        if (s === 404 || s === 409) return eA.response; // 이미 언팔 상태 → 성공 간주
        try {
          return await baseApi.post(`/user/${targetUserId}/unfollow`, {});
        } catch (eB) {
          try {
            return await baseApi.delete(`/follow/${targetUserId}`);
          } catch (eC) {
            return await baseApi.post(`/follow/cancel`, { targetUserId });
          }
        }
      }
    }
  }

  // 메인 팔로우/언팔로우 처리
  const handleMainFollow = async () => {
    if (isToggling) return; // 중복 방지
    if (!user?.id) return;
    if (!currentUser?.id) {
      setError("로그인이 필요합니다.");
      return;
    }
    if (currentUser.id === Number(userId)) return;

    const wantFollow = !isFollowing;
    setIsToggling(true);

    // 낙관적 업데이트
    setIsFollowing(wantFollow);
    setUser((prev) =>
      prev
        ? {
            ...prev,
            followerCount: (prev.followerCount ?? 0) + (wantFollow ? 1 : -1),
          }
        : prev
    );

    try {
      await requestFollowToggle(user.id, wantFollow);
      await refreshFollowInfo();
    } catch (e) {
      // 롤백
      setIsFollowing(!wantFollow);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              followerCount: (prev.followerCount ?? 0) + (wantFollow ? -1 : 1),
            }
          : prev
      );
      const status = e?.response?.status;
      if (status === 400) setError("요청 형식이 올바르지 않아요. (400)");
      else if (status === 401) setError("로그인이 필요합니다. (401)");
      else if (status === 404) setError("엔드포인트가 없어요. (404)");
      else if (status === 409) setError("이미 처리된 상태예요. (409)");
      else setError("팔로우 처리 중 오류가 발생했습니다.");
    } finally {
      setIsToggling(false);
    }
  };

  // 모달 내 팔로우/언팔로우 처리
  const handleFollow = async (targetUserId) => {
    const wantFollow = !followingUsers.has(targetUserId);

    // 낙관적 업데이트
    setFollowingUsers((prev) => {
      const s = new Set(prev);
      wantFollow ? s.add(targetUserId) : s.delete(targetUserId);
      return s;
    });

    try {
      await requestFollowToggle(targetUserId, wantFollow);
      if (showModal) await loadFollowData(modalType);
      await refreshFollowInfo();
    } catch (e) {
      // 롤백
      setFollowingUsers((prev) => {
        const s = new Set(prev);
        wantFollow ? s.delete(targetUserId) : s.add(targetUserId);
        return s;
      });
      console.error("팔로우/언팔로우 실패:", e);
      setError("팔로우 처리 중 오류가 발생했습니다.");
    }
  };

  // 모달 열기/닫기
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

  const handleBack = () => navigate(-1);
  const handlePostClick = (postId) => navigate(`/post/${postId}`);

  const isOwnProfile = currentUser?.id === Number(userId);

  return (
    <div className="profile-page">
      {loading && (
        <div className="profile-loading">
          <div>로딩 중...</div>
        </div>
      )}

      <div className="profile-header-nav">
        <button className="profile-back-btn" onClick={handleBack}>
          <FaArrowLeft />
        </button>
        <h1 className="profile-header-title">{user?.nickname || "프로필"}</h1>
      </div>

      <section className="profile-header">
        <img
          className="profile-avatar-lg"
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
        <h1 className="profile-name">{user?.nickname}</h1>

        {!isOwnProfile && (
          <div className="profile-follow-section">
            <button
              className={`profile-follow-btn ${isFollowing ? "following" : ""}`}
              onClick={handleMainFollow}
              disabled={isToggling}
            >
              {isToggling ? "처리중..." : isFollowing ? "팔로잉" : "팔로우"}
            </button>
            {error && (
              <div
                className="profile-follow-error"
                style={{
                  fontSize: "12px",
                  color: "#e74c3c",
                  marginTop: "5px",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        <div className="profile-stats">
          <div className="profile-stat" onClick={() => openModal("followers")}>
            <div className="profile-stat-value">
              팔로워 {user?.followerCount?.toLocaleString?.() ?? "0"}
            </div>
          </div>
          <div className="profile-stat" onClick={() => openModal("following")}>
            <div className="profile-stat-value">
              팔로잉 {user?.followingCount?.toLocaleString?.() ?? "0"}
            </div>
          </div>
        </div>
      </section>

      <div className="profile-section-header">
        <h2 className="profile-section-title">게시글</h2>
      </div>

      <div className="profile-posts">
        {posts.length === 0 ? (
          <div className="profile-no-posts">게시글이 없습니다.</div>
        ) : (
          posts.map((post) => {
            const img1 =
              post?.photos?.[0] || post?.image1 || "/default-image.png";
            const img2 =
              post?.photos?.[1] ||
              post?.image2 ||
              post?.photos?.[0] ||
              "/default-image.png";
            const dateStr = post?.createdAt
              ? new Date(post.createdAt).toString() !== "Invalid Date"
                ? new Date(post.createdAt).toLocaleDateString("ko-KR")
                : ""
              : "";

            return (
              <div
                key={post.id}
                className="profile-card"
                onClick={() => handlePostClick(post.id)}
              >
                <div className="profile-card-images">
                  <img
                    src={post.places?.[0]?.photoUrl}
                    alt={`${post.title} 이미지 1`}
                    className="profile-card-image"
                  />
                  <img
                    src={post.places?.[1]?.photoUrl}
                    alt={`${post.title} 이미지 2`}
                    className="profile-card-image"
                  />
                </div>

                <div className="profile-card-content">
                  <div className="profile-card-header">
                    <img
                      src={
                        post?.author?.profileImage ||
                        user?.profileImageUrl ||
                        "https://www.studiopeople.kr/common/img/default_profile.png"
                      }
                      alt={post?.author?.nickname || "작성자"}
                      className="profile-card-avatar"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        objectPosition: "center",
                      }}
                    />
                    <div className="profile-card-info">
                      <div className="profile-meta">
                        {post?.author?.nickname || user?.nickname}
                        {dateStr && ` • ${dateStr}`}
                      </div>
                      <h3 className="profile-title">{post.title}</h3>

                      <div className="profile-tags">
                        {Array.isArray(post?.tags) &&
                          post.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="profile-tag">
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

                      <div className="profile-actions">
                        <div className="profile-pill">
                          <FaBookmark className="profile-icon" />
                          <span>
                            {post?.scrapCount >= 1000
                              ? `${(post.scrapCount / 1000).toFixed(1)}K`
                              : post?.scrapCount ?? 0}
                          </span>
                        </div>
                        <div className="profile-pill">
                          <FaHeart className="profile-icon" />
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

      {showModal && (
        <div className="profile-modal-overlay" onClick={closeModal}>
          <div
            className="profile-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-modal-header">
              <h3>{modalType === "followers" ? "팔로워" : "팔로잉"}</h3>
              <button className="profile-modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="profile-modal-body">
              {loading ? (
                <div className="profile-modal-loading">로딩 중...</div>
              ) : error ? (
                <div
                  className="profile-error-message"
                  style={{ padding: 20, textAlign: "center", color: "#666" }}
                >
                  <p>⚠️ {error}</p>
                  <button
                    onClick={() => loadFollowData(modalType)}
                    style={{
                      marginTop: 10,
                      padding: "8px 16px",
                      backgroundColor: "#007bff",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    다시 시도
                  </button>
                </div>
              ) : (modalType === "followers" ? followers : following).length ===
                0 ? (
                <div
                  className="profile-modal-empty"
                  style={{ padding: 20, textAlign: "center", color: "#999" }}
                >
                  {modalType === "followers"
                    ? "팔로워가 없습니다."
                    : "팔로잉이 없습니다."}
                </div>
              ) : (
                (modalType === "followers" ? followers : following).map(
                  (person) => (
                    <div key={person.id} className="profile-user-item">
                      <img
                        src={
                          person.profileImageUrl ||
                          "https://www.studiopeople.kr/common/img/default_profile.png"
                        }
                        alt={person.nickname || person.name}
                        className="profile-user-avatar"
                        onClick={() => navigate(`/profile/${person.id}`)}
                        style={{
                          cursor: "pointer",
                          width: 50,
                          height: 50,
                          borderRadius: "50%",
                          objectFit: "cover",
                          objectPosition: "center",
                        }}
                      />
                      <div className="profile-user-info">
                        <span
                          className="profile-user-name"
                          onClick={() => navigate(`/profile/${person.id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          {person.nickname || person.name}
                        </span>
                      </div>
                      {person.id !== currentUser?.id && (
                        <button
                          className={`profile-follow-btn ${
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

      {error && !showModal && <div className="profile-error">{error}</div>}
    </div>
  );
}
