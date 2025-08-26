import { useState, useEffect } from "react";
import Modal from "./Modal";
import LoginForm from "../login/LoginForm";
import Register from "../../pages/Register";
import FindPassword from "../login/FindPassword";

const LoginRegisterModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState("login");
  useEffect(() => {
    if (!isOpen) {
      setMode("login");
    }
  }, [isOpen]);

  const onRegisterSuccess = () => {
    setMode("login");
  };
  const onPasswordReset = () => setMode("login");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={mode === "register" ? "modal-register" : "modal-default"}
    >
      {mode === "login" && (
        <LoginForm
          onSwitch={() => setMode("register")}
          onFindPassword={() => setMode("findPassword")}
          onLoginSuccess={onLoginSuccess}
        />
      )}
      {mode === "register" && (
        <Register
          onSwitch={() => setMode("login")}
          onRegisterSuccess={onRegisterSuccess}
        />
      )}
      {mode === "findPassword" && (
        <FindPassword
          onCancel={() => setMode("login")}
          onSuccess={onPasswordReset}
        />
      )}
    </Modal>
  );
};

export default LoginRegisterModal;
