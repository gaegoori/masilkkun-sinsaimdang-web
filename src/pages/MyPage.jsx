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
        console.log("마이페이지 사용자 정보:", userResponse.data);

        // API 응답 구조에 따른 유연한 처리
        let userData = null;
        if (userResponse.data?.success) {
          userData = userResponse.data.data;
        } else if (userResponse.data?.data) {
          userData = userResponse.data.data;
        } else if (userResponse.data?.nickname) {
          userData = userResponse.data;
        }

        console.log("사용자 데이터:", userData);

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

          console.log("완성된 사용자 데이터:", completeUserData);
          setUser(completeUserData);
          setEditForm({
            nickname: userData.nickname || userData.name || "",
            profileImageUrl: userData.profileImageUrl || "",
          });
        } else {
          console.error("사용자 데이터를 찾을 수 없습니다:", userResponse.data);
        }

        // 사용자 게시글 로드 (올바른 API 사용)
        try {
          console.log("내가 작성한 게시글 로드 시작");

          // 내가 작성한 게시글 가져오기 (스크랩이 아닌)
          let myPostsResponse;
          try {
            // 1차 시도: 작성한 게시글 API
            myPostsResponse = await baseApi.get(
              `/user/${userData.id}/articles`
            );
            console.log("작성한 게시글 API 성공:", myPostsResponse.data);
          } catch (articlesError) {
            console.warn(
              "작성한 게시글 API 실패, 대체 API 시도:",
              articlesError.response?.status
            );

            // 2차 시도: 대체 엔드포인트들
            const alternativeEndpoints = [
              `/user/me/articles`, // 현재 사용자의 게시글
              `/user/me/posts`, // 현재 사용자의 포스트
              `/user/${userData.id}/posts`, // 사용자 ID로 포스트 조회
            ];

            let success = false;
            for (const endpoint of alternativeEndpoints) {
              try {
                console.log(`대체 게시글 API 시도: ${endpoint}`);
                myPostsResponse = await baseApi.get(endpoint);
                console.log(
                  `대체 게시글 API 성공 (${endpoint}):`,
                  myPostsResponse.data
                );
                success = true;
                break;
              } catch (altError) {
                console.warn(
                  `대체 API 실패 (${endpoint}):`,
                  altError.response?.status
                );
              }
            }

            if (!success) {
              throw articlesError; // 모든 시도 실패 시 원래 에러 던지기
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

          console.log("정규화된 게시글 데이터:", normalizedPosts);
          setPosts(normalizedPosts);
        } catch (postsError) {
          console.error("게시글 로드 실패:", postsError);

          // 게시글 로드 실패 시에도 빈 배열로 설정하여 UI가 깨지지 않도록
          setPosts([]);

          // 에러는 사용자에게 표시하지 않고 콘솔에만 기록
          // (사용자 정보는 로드되었으므로 페이지 자체는 사용 가능)
        }
      } catch (e) {
        console.error("사용자 정보 로드 실패:", e);
        setError("사용자 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 에러 처리를 개선한 팔로우 데이터 로드 함수
  const loadFollowDataAlternative = async (type) => {
    if (!user?.id) {
      console.error("사용자 ID가 없습니다:", user);
      setError("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`=== ${type} 데이터 로드 시작 ===`);
      console.log("현재 사용자:", user);
      console.log("사용자 ID:", user.id, typeof user.id);

      let endpoint;
      if (type === "followers") {
        endpoint = `/user/${user.id}/followers`;
      } else {
        endpoint = `/user/${user.id}/followings`;
      }

      console.log(`API 호출: ${endpoint}`);

      // 1차 시도: 기본 엔드포인트
      let response;
      try {
        response = await baseApi.get(endpoint);
        console.log("API 호출 성공:", response.data);
      } catch (primaryError) {
        console.warn("1차 API 호출 실패:", primaryError.response?.status);

        // 2차 시도: 다른 엔드포인트 패턴들
        const alternativeEndpoints = [
          `/users/${user.id}/${type}`, // users 복수형
          `/follow/${user.id}/${type}`, // follow 경로
          `/${type}/${user.id}`, // 순서 바뀐 경로
          `/user/me/${type}`, // 현재 사용자 기준
        ];

        let successfulResponse = null;

        for (const altEndpoint of alternativeEndpoints) {
          try {
            console.log(`대체 API 시도: ${altEndpoint}`);
            successfulResponse = await baseApi.get(altEndpoint);
            console.log(
              `대체 API 성공 (${altEndpoint}):`,
              successfulResponse.data
            );
            response = successfulResponse;
            break;
          } catch (altError) {
            console.warn(
              `대체 API 실패 (${altEndpoint}):`,
              altError.response?.status
            );
          }
        }

        // 모든 시도가 실패한 경우
        if (!successfulResponse) {
          throw primaryError;
        }
      }

      // 응답 데이터 처리
      if (response && response.data) {
        // 서버에서 success: false를 보낸 경우
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

          console.log("처리된 팔로워 데이터:", followersData);
          setFollowers(Array.isArray(followersData) ? followersData : []);
        } else {
          const followingData =
            response.data?.data?.content ||
            response.data?.data ||
            response.data?.following ||
            response.data ||
            [];

          console.log("처리된 팔로잉 데이터:", followingData);
          const followingArray = Array.isArray(followingData)
            ? followingData
            : [];
          setFollowing(followingArray);
          setFollowingUsers(new Set(followingArray.map((u) => u.id)));
        }
      }
    } catch (e) {
      console.error(`${type} 데이터 로드 실패:`, e);

      // 임시 해결책: 빈 배열로 설정
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

  // loadFollowData 함수 추가 (기존 코드에서 사용됨)
  const loadFollowData = loadFollowDataAlternative;

  // 서버 상태 확인용 함수
  const checkServerStatus = async () => {
    try {
      console.log("=== 서버 상태 확인 ===");

      // 1. 사용자 정보 확인
      const userCheck = await baseApi.get("/user/me");
      console.log("사용자 정보 확인:", userCheck.status, userCheck.data);

      // 2. 팔로우 정보 확인
      if (user?.id) {
        const followInfoCheck = await baseApi.get(
          `/user/${user.id}/follow-info`
        );
        console.log(
          "팔로우 정보 확인:",
          followInfoCheck.status,
          followInfoCheck.data
        );
      }

      console.log("=== 서버 기본 상태는 정상 ===");
    } catch (e) {
      console.error("서버 상태 확인 실패:", e);
    }
  };

  // API 테스트용 함수 (임시로 추가 - 디버깅용)
  const testFollowAPI = async () => {
    if (!user?.id) {
      console.log("사용자 ID 없음");
      return;
    }

    console.log("=== API 테스트 시작 ===");

    // 1. 팔로우 정보 API 테스트
    try {
      console.log("1. 팔로우 정보 API 테스트");
      const followInfoResponse = await baseApi.get(
        `/user/${user.id}/follow-info`
      );
      console.log("팔로우 정보 성공:", followInfoResponse.data);
    } catch (e) {
      console.error("팔로우 정보 실패:", e.response?.status, e.response?.data);
    }

    // 2. 팔로워 API 테스트
    try {
      console.log("2. 팔로워 API 테스트");
      const followersResponse = await baseApi.get(`/user/${user.id}/followers`);
      console.log("팔로워 성공:", followersResponse.data);
    } catch (e) {
      console.error("팔로워 실패:", e.response?.status, e.response?.data);
    }

    // 3. 팔로잉 API 테스트
    try {
      console.log("3. 팔로잉 API 테스트");
      const followingResponse = await baseApi.get(`/user/${user.id}/following`);
      console.log("팔로잉 성공:", followingResponse.data);
    } catch (e) {
      console.error("팔로잉 실패:", e.response?.status, e.response?.data);
    }

    console.log("=== API 테스트 종료 ===");
  };

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

  // 수정된 openModal 함수
  const openModal = async (type) => {
    setModalType(type);
    setShowModal(true);

    // 일단 모달은 열고, 데이터는 백그라운드에서 로드
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

  // 게시글 삭제 (서버 문제 대응)
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

      const ids = Array.from(selectedPosts);
      console.log("게시글 삭제 시도:", ids);

      // 서버에서 삭제 API가 작동하지 않는 상황 안내
      setError(
        `⚠️ 현재 서버에 문제가 있어 게시글 삭제 기능을 사용할 수 없습니다.\n\n` +
          `개발팀에서 해결 중이니 잠시 후 다시 시도해주세요.\n\n` +
          `불편을 드려 죄송합니다.`
      );

      // 삭제 모드 해제 및 선택 초기화
      setSelectedPosts(new Set());
      setIsDeleteMode(false);

      /* 
      // 서버가 수정되면 아래 코드를 다시 활성화하세요
      const deleteResults = [];
      
      // 각 게시글을 개별적으로 삭제 시도
      for (const id of ids) {
        try {
          console.log(`게시글 ${id} 삭제 시도`);
          
          // 다양한 삭제 API 엔드포인트 시도
          let deleteSuccess = false;
          const deleteEndpoints = [
            `/articles/${id}`,           // 기본 엔드포인트
            `/posts/${id}`,              // posts 경로
            `/user/articles/${id}`,      // 사용자 게시글 경로
            `/user/posts/${id}`,         // 사용자 포스트 경로
          ];

          for (const endpoint of deleteEndpoints) {
            try {
              console.log(`삭제 API 시도: DELETE ${endpoint}`);
              const response = await baseApi.delete(endpoint);
              console.log(`게시글 ${id} 삭제 성공 (${endpoint}):`, response.data);
              deleteSuccess = true;
              deleteResults.push({ id, success: true, endpoint });
              break;
            } catch (deleteError) {
              console.warn(`삭제 실패 (${endpoint}):`, deleteError.response?.status);
              if (deleteError.response?.status === 404) {
                // 404는 이미 삭제되었거나 존재하지 않는 게시글
                console.log(`게시글 ${id}는 이미 존재하지 않습니다.`);
                deleteSuccess = true;
                deleteResults.push({ id, success: true, endpoint, note: "already_deleted" });
                break;
              }
            }
          }

          if (!deleteSuccess) {
            console.error(`게시글 ${id} 삭제 실패: 모든 엔드포인트 시도 실패`);
            deleteResults.push({ id, success: false });
          }

        } catch (error) {
          console.error(`게시글 ${id} 삭제 중 예외:`, error);
          deleteResults.push({ id, success: false, error: error.message });
        }
      }

      console.log("삭제 결과:", deleteResults);

      // 성공한 게시글들만 UI에서 제거
      const successfulDeletes = deleteResults
        .filter(result => result.success)
        .map(result => result.id);

      if (successfulDeletes.length > 0) {
        setPosts((prev) => prev.filter((p) => !successfulDeletes.includes(p.id)));
        
        // 성공한 게시글들을 선택에서 제거
        setSelectedPosts(prev => {
          const newSet = new Set(prev);
          successfulDeletes.forEach(id => newSet.delete(id));
          return newSet;
        });
      }

      const failedDeletes = deleteResults.filter(result => !result.success);
      
      if (failedDeletes.length > 0) {
        setError(
          `${successfulDeletes.length}개 게시글은 삭제되었지만, ` +
          `${failedDeletes.length}개 게시글 삭제에 실패했습니다. ` +
          `실패한 게시글: ${failedDeletes.map(f => f.id).join(", ")}`
        );
      } else {
        // 모든 게시글이 성공적으로 삭제된 경우
        setSelectedPosts(new Set());
        setIsDeleteMode(false);
        
        if (successfulDeletes.length === 1) {
          // 성공 메시지는 간단하게
          console.log("게시글이 삭제되었습니다.");
        } else {
          console.log(`${successfulDeletes.length}개의 게시글이 삭제되었습니다.`);
        }
      }
      */
    } catch (e) {
      console.error("게시글 삭제 중 전체 에러:", e);
      setError(
        "현재 서버 문제로 게시글 삭제가 불가능합니다. 관리자에게 문의하세요."
      );
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
    // editForm을 원래 사용자 정보로 복원
    setEditForm({
      nickname: user?.nickname || "",
      profileImageUrl: user?.profileImageUrl || "",
    });
    setIsEditingProfile(false);
    setError(null);
    setLoading(false);
  };

  // 수정된 saveProfile 함수
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

          console.log("이미지 업로드 응답:", uploadResponse.data);
          console.log(
            "추출할 URL:",
            uploadResponse.data?.data?.profileImageUrl
          );

          finalProfileImageUrl =
            uploadResponse.data?.data?.profileImageUrl ||
            uploadResponse.data?.profileImageUrl ||
            uploadResponse.data?.data?.url ||
            uploadResponse.data?.url ||
            uploadResponse.data?.imageUrl;

          console.log("최종 이미지 URL:", finalProfileImageUrl);

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

        // 백그라운드 동기화
        try {
          const userResponse = await baseApi.get("/user/me");
          const userData = userResponse.data?.success
            ? userResponse.data.data
            : userResponse.data?.data
            ? userResponse.data.data
            : userResponse.data?.nickname
            ? userResponse.data
            : null;

          if (userData) {
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

            // 최종 동기화 이벤트 발생
            window.dispatchEvent(
              new CustomEvent("userProfileUpdated", {
                detail: {
                  nickname: completeUserData.nickname,
                  profileImageUrl: completeUserData.profileImageUrl,
                  user: completeUserData,
                },
              })
            );
          }
        } catch (syncError) {
          console.warn("백그라운드 동기화 실패:", syncError);
        }
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

  // 수정된 handleImageUpload 함수
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (예: 5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      setError("이미지 파일은 5MB 이하여야 합니다.");
      return;
    }

    // 파일 타입 체크
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

      {/* 팔로워/팔로잉 모달 (에러 처리 개선) */}
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
