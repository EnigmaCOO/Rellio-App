import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import ProfileSection from "@/components/profile/ProfileSection";

export default function ProfilePage() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isGuest } = useAuth();

  const handleLogout = () => {
    setLocation("/");
  };

  // Redirect if not authenticated or is guest
  if (isGuest || !isAuthenticated) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50">
      <ProfileSection onLogout={handleLogout} />
    </div>
  );
}