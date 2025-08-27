import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText, Shield, Users, Scale, Globe, Mail } from "lucide-react";

export default function TermsOfServicePage() {
  const [, setLocation] = useLocation();

  const handleBackToHome = () => {
    setLocation('/');
  };

  return (
    <div 
      className="min-h-screen py-12 px-4"
      style={{
        background: `
          linear-gradient(135deg, #060A1A 0%, #0A0F29 50%, #060A1A 100%),
          radial-gradient(ellipse at 30% 40%, rgba(212, 175, 55, 0.12) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 80%, rgba(147, 51, 234, 0.08) 0%, transparent 50%)
        `
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={handleBackToHome}
            variant="ghost"
            className="mb-6 text-text-muted hover:text-gold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Scale className="w-8 h-8 text-gold mr-3" />
              <h1 className="text-4xl font-serif text-text-primary">Terms of Service</h1>
            </div>
            <p className="text-text-muted font-light">
              Your agreement for using Rellio's spiritual exploration platform
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <Card 
          className="bg-white rounded-2xl shadow-md border-0 relative overflow-hidden"
          style={{
            background: `
              linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%),
              linear-gradient(45deg, rgba(75, 0, 130, 0.1) 0%, rgba(212, 175, 55, 0.1) 100%)
            `
          }}
        >
          {/* Gradient Overlay */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              background: 'linear-gradient(45deg, rgba(75, 0, 130, 1) 0%, rgba(212, 175, 55, 1) 100%)'
            }}
          />
          
          <CardContent className="p-8 relative z-10">
            <div className="prose max-w-none font-serif text-gray-800 leading-relaxed">
              
              {/* Title and Last Updated */}
              <div className="text-center mb-8 pb-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Rellio Terms of Service</h2>
                <p className="text-lg text-gray-600 font-medium">Last Updated: August 26, 2025</p>
              </div>

              {/* Introduction */}
              <div className="mb-8 p-6 bg-gradient-to-r from-teal-50 to-purple-50 rounded-lg border-l-4" style={{borderLeftColor: '#00D5FF'}}>
                <p className="text-lg leading-relaxed">
                  Welcome to Rellio, a platform dedicated to exploring sacred scriptures and fostering spiritual growth through AI-driven insights. These Terms of Service ("Terms") govern your use of the Rellio app and website (collectively, the "Service"). By accessing or using Rellio, you agree to be bound by these Terms. If you do not agree, please refrain from using the Service.
                </p>
              </div>

              {/* Section 1 */}
              <section className="mb-8">
                <div className="flex items-center mb-4">
                  <FileText className="w-6 h-6 mr-3" style={{color: '#00D5FF'}} />
                  <h3 className="text-2xl font-bold text-gray-900">1. Acceptance of Terms</h3>
                </div>
                <p className="mb-4">
                  By creating an account (via email, phone, Google, Facebook, X, Instagram) or using Rellio, you accept these Terms and our <a href="/privacy" className="underline" style={{color: '#00D5FF'}}>Privacy Policy</a>, which is incorporated herein. We may update these Terms periodically; we will notify you via the app or email, and continued use constitutes acceptance.
                </p>
              </section>

              {/* Section 2 */}
              <section className="mb-8">
                <div className="flex items-center mb-4">
                  <Users className="w-6 h-6 mr-3" style={{color: '#00D5FF'}} />
                  <h3 className="text-2xl font-bold text-gray-900">2. Eligibility</h3>
                </div>
                <p className="mb-4">
                  You must be at least 13 years old (or 16 in regions with stricter laws) to use Rellio. By using the Service, you represent that you meet this age requirement and have the legal capacity to enter into these Terms.
                </p>
              </section>

              {/* Section 3 */}
              <section className="mb-8">
                <div className="flex items-center mb-4">
                  <Shield className="w-6 h-6 mr-3" style={{color: '#00D5FF'}} />
                  <h3 className="text-2xl font-bold text-gray-900">3. Account Registration and Security</h3>
                </div>
                <ul className="list-disc pl-6 space-y-3 mb-4">
                  <li><strong>Registration:</strong> You may sign up using email, phone number, or social media accounts. You must provide accurate information and update it as needed.</li>
                  <li><strong>Verification:</strong> We use OTP codes (via email/SMS) or social login to verify your identity. You are responsible for maintaining the confidentiality of your account credentials.</li>
                  <li><strong>Security:</strong> Notify us immediately at <a href="mailto:support@rellio.com" className="underline" style={{color: '#00D5FF'}}>support@rellio.com</a> of any unauthorized use. We are not liable for losses due to compromised accounts.</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section className="mb-8">
                <div className="flex items-center mb-4">
                  <Globe className="w-6 h-6 mr-3" style={{color: '#00D5FF'}} />
                  <h3 className="text-2xl font-bold text-gray-900">4. Use of the Service</h3>
                </div>
                <p className="mb-4">
                  Rellio provides AI-guided exploration of scriptures (e.g., Bible, Quran, Torah, Bhagavad Gita, Vedas) with features like voice chat, Compare Mode (themes like love, compassion), and scholar personas (e.g., Christian Priest, Islamic Mufti). You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Use the Service only for lawful, personal, non-commercial purposes.</li>
                  <li>Not engage in hate speech, offensive language, or bias against any religion—our goal is to unite through understanding.</li>
                  <li>Respect intellectual property (e.g., copyrighted texts) and avoid scraping or redistributing content.</li>
                </ul>
              </section>

              {/* Sections 5-11 in a more compact format */}
              <div className="space-y-6 mb-8">
                <section className="p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">5. Content and Moderation</h3>
                  <ul className="text-sm space-y-2">
                    <li><strong>User Content:</strong> You retain ownership of chat inputs, but grant Rellio a license to process and store them for service delivery (see Privacy Policy).</li>
                    <li><strong>Moderation:</strong> We ban offensive words and hate speech (e.g., slurs, religious attacks) using automated filters and AI (OpenAI/XAI). Violations may result in warnings, bans, or content removal.</li>
                    <li><strong>Rellio Content:</strong> Scriptures and AI responses are licensed for personal use only.</li>
                  </ul>
                </section>

                <section className="p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">6. Subscription and Payments</h3>
                  <ul className="text-sm space-y-2">
                    <li>Rellio offers free access with limits; premium features (e.g., higher quotas) may require payment. Details are in our Pricing Policy (to be added).</li>
                    <li>All transactions are final; contact support for refunds within 7 days.</li>
                  </ul>
                </section>

                <section className="p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">7. Intellectual Property</h3>
                  <p className="text-sm">
                    Rellio and its content (design, logos, code) are owned by us or licensors. You may not copy, modify, or distribute without permission.
                  </p>
                </section>

                <section className="p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">8. Disclaimers and Limitations</h3>
                  <ul className="text-sm space-y-2">
                    <li>The Service is provided "as is" without warranties of accuracy or uninterrupted use. AI responses reflect interpretations, not definitive doctrine.</li>
                    <li>Liability is limited to the maximum extent permitted by law.</li>
                  </ul>
                </section>

                <section className="p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">9. Termination</h3>
                  <p className="text-sm">
                    We may suspend or terminate your account for violations (e.g., hate speech, fraud). You may delete your account via settings, subject to data retention policies.
                  </p>
                </section>

                <section className="p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">10. Governing Law and Dispute Resolution</h3>
                  <p className="text-sm">
                    These Terms are governed by U.S. law. Disputes will be resolved through binding arbitration (e.g., AAA rules) unless prohibited, with a 30-day negotiation period.
                  </p>
                </section>
              </div>

              {/* Final Section */}
              <section className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border-l-4" style={{borderLeftColor: '#00D5FF'}}>
                <div className="flex items-center mb-3">
                  <Mail className="w-5 h-5 mr-2" style={{color: '#00D5FF'}} />
                  <h3 className="text-xl font-bold text-gray-900">11. Contact Us</h3>
                </div>
                <p className="text-sm mb-2">
                  For questions or concerns: <a href="mailto:support@rellio.com" className="underline" style={{color: '#00D5FF'}}>support@rellio.com</a>. We're here to guide your spiritual journey.
                </p>
              </section>

              {/* Disclaimer */}
              <div className="text-center py-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 italic">
                  By using Rellio, you agree to these Terms. For legal advice, consult a professional—this is not exhaustive.
                </p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Button
            onClick={handleBackToHome}
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold/10 hover:border-gold"
          >
            Return to Rellio
          </Button>
        </div>
      </div>
    </div>
  );
}