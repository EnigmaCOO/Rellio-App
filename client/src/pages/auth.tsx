import AuthForm from "@/components/auth/AuthForm";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, navigate] = useLocation();

  const handleAuthSuccess = () => {
    navigate("/");
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <AuthForm 
      onSuccess={handleAuthSuccess}
      onBack={handleBack}
    />
  );
}