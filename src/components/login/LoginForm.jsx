// src/components/login/LoginForm.jsx
import logo from "../../assets/Logo.png";
import "./LoginForm.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import baseApi from "../../api/baseApi";

const LoginForm = ({ onSwitch, onLoginSuccess }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false); // 로그인 유지
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nav = useNavigate();

  const onIdChange = (e) => {
    setId(e.target.value);
    if (errorMessage) setErrorMessage("");
  };

  const onPasswordChange = (e) => {
    setPassword(e.target.value);
    if (errorMessage) setErrorMessage("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await baseApi.post("/auth/login", {
        email: id,
        password,
        // 서버가 remember 정책을 참고한다면 같이 넘겨도 무방
        rememberMe,
      });

      // 응답 구조에 맞게 조정 (지금 구조: data.data.accessToken)
      const accessToken = response?.data?.data?.accessToken;
      if (!accessToken) {
        throw new Error("토큰이 없습니다.");
      }

      // ✅ 로그인 유지 체크 시: localStorage
      // ✅ 미체크 시: sessionStorage
      if (rememberMe) {
        localStorage.setItem("accessToken", accessToken);
        sessionStorage.removeItem("accessToken");
      } else {
        sessionStorage.setItem("accessToken", accessToken);
        localStorage.removeItem("accessToken");
      }

      // 상위에서 모달 닫기/유저 상태 갱신 등에 사용한다면
      onLoginSuccess?.(accessToken);

      // 로그인 후 이동
      nav("/app/postlist", { replace: true });
    } catch (error) {
      console.error("로그인 실패:", error);
      setErrorMessage("아이디 또는 비밀번호가 올바르지 않습니다.");
      // 저장소 정리(선택)
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="loginform">
      <img src={logo} alt="로고" className="logo" />
      <form onSubmit={handleLogin} noValidate>
        <div className="formbox">
          <div className="formtitle">로그인/회원가입</div>

          <div className="formbody">
            <div className="inputs">
              <input
                className="input"
                type="text"
                value={id}
                onChange={onIdChange}
                placeholder="아이디"
                autoComplete="username"
                required
              />
              <input
                className="input"
                type="password"
                value={password}
                onChange={onPasswordChange}
                placeholder="비밀번호"
                autoComplete="current-password"
                required
              />
              <div className="error-container">
                {errorMessage && (
                  <p className="error-message">{errorMessage}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </div>

          <div className="login-option">
            <label className="checkbox-label">
              <input
                type="checkbox"
                onChange={(e) => setRememberMe(e.target.checked)}
                checked={rememberMe}
              />
              로그인 유지
            </label>

            <span
              className="pla-button"
              role="button"
              tabIndex={0}
              onClick={() => {}}
              onKeyDown={(e) => e.key === "Enter" && onSwitch()}
            >
              아이디/비밀번호 찾기
            </span>

            <span
              className="plain-button"
              role="button"
              tabIndex={0}
              onClick={onSwitch}
              onKeyDown={(e) => e.key === "Enter" && onSwitch()}
            >
              회원가입
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
