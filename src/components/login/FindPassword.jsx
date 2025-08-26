import { useState } from "react";
import baseApi from "../../api/baseApi";

const FindPassword = ({ onSwitch }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFindPassword = async () => {
    setMessage("");
    setError("");

    if (!email.includes("@")) {
      setError("올바른 이메일을 입력해주세요.");
      return;
    }

    try {
      const response = await baseApi.post("/auth/find-password", { email });
      if (response.status === 200) {
        setMessage("비밀번호 재설정 링크를 이메일로 전송했습니다.");
      }
    } catch (err) {
      console.error("비밀번호 찾기 오류:", err);
      setError(err.response?.data?.message || "비밀번호 찾기에 실패했습니다.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px",
        borderRadius: "12px",
        backgroundColor: "#fff",
        width: "100%",
        maxWidth: "400px",
        textAlign: "center",
      }}
    >
      <h3 style={{ color: "#9a7937", margin: 0 }}>🔑 비밀번호 찾기</h3>
      <p style={{ color: "#9a7937", margin: 0 }}>
        가입한 이메일 주소를 입력해주세요.
      </p>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일 입력"
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />

      <button
        onClick={handleFindPassword}
        style={{
          padding: "10px 25px",
          fontSize: "1rem",
          fontWeight: "600",
          color: "#fff",
          backgroundColor: "#9a7937",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#7f6530")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "#9a7937")
        }
      >
        이메일 전송
      </button>

      {message && <p style={{ color: "green", margin: 0 }}>{message}</p>}
      {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}

      <button
        onClick={onSwitch}
        style={{
          marginTop: "10px",
          background: "none",
          border: "none",
          color: "#9a7937",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        로그인 화면으로 돌아가기
      </button>
    </div>
  );
};

export default FindPassword;
