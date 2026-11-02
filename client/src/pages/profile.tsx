import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import ProfileSection from "@/components/profile/ProfileSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  const handleLogout = () => {
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  // Friendly upgrade prompt for guests instead of a hard redirect
  if (isGuest || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-white shadow-sm border border-gray-200 rounded-3xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6 text-gray-700" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create a free account</h2>
            <p className="text-gray-600 text-sm">
              Save your reading progress, sync across devices, and personalize Rellio to your spiritual journey.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                className="w-full h-11 rounded-xl bg-gray-900 hover:bg-gray-700 text-white"
                onClick={() => setLocation("/auth")}
              >
                Create account or sign in
              </Button>
              <Button
                variant="ghost"
                className="w-full h-11 rounded-xl text-gray-600"
                onClick={() => setLocation("/")}
              >
                Continue as guest
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ProfileSection onLogout={handleLogout} />
    </div>
  );
}