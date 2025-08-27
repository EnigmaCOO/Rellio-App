import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Eye, Users, Globe, Clock, Mail, FileText } from "lucide-react";

export default function PrivacyPolicyPage() {
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
              <Shield className="w-8 h-8 text-gold mr-3" />
              <h1 className="text-4xl font-serif text-text-primary">Privacy Policy</h1>
            </div>
            <p className="text-text-muted font-light">
              Your privacy and spiritual journey are protected with the highest care
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <Card 
          className="bg-black/90 backdrop-blur-sm shadow-2xl border border-gold/20 relative overflow-hidden"
          style={{
            borderRadius: '12px',
            background: `
              linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(10,15,41,0.95) 50%, rgba(0,0,0,0.9) 100%),
              linear-gradient(45deg, rgba(147, 51, 234, 0.1) 0%, rgba(212, 175, 55, 0.1) 100%)
            `
          }}
        >
          {/* Gradient Overlay */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background: 'linear-gradient(45deg, rgba(147, 51, 234, 0.3) 0%, rgba(212, 175, 55, 0.3) 100%)'
            }}
          />
          
          <CardContent className="p-8 relative z-10">
            <div className="prose max-w-none font-serif text-gray-200 leading-relaxed">
              
              {/* Title and Last Updated */}
              <div className="text-center mb-8 pb-6 border-b border-gold/30">
                <h2 className="text-3xl font-bold text-gold mb-2">Rellio Privacy Policy</h2>
                <p className="text-lg text-gray-300 font-medium">Last Updated: August 26, 2025</p>
              </div>

              {/* Introduction */}
              <div className="mb-8 p-6 bg-gradient-to-r from-purple-900/40 to-gold/20 rounded-lg border-l-4 border-gold">
                <p className="text-lg leading-relaxed text-gray-200">
                  At Rellio (the "App" or "Platform"), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our App, which provides AI-driven exploration of sacred scriptures across multiple religious traditions. By accessing or using Rellio, you agree to the terms of this Policy. If you do not agree, please do not use the App.
                </p>
                <p className="mt-4 text-base text-gray-300">
                  We may update this Policy from time to time. We will notify you of significant changes by posting the updated Policy in the App or via email. Your continued use of the App after changes constitutes acceptance of the revised Policy.
                </p>
              </div>

              {/* Section 1 */}
              <section className="mb-8">
                <div className="flex items-center mb-4">
                  <FileText className="w-6 h-6 text-gold mr-3" />
                  <h3 className="text-2xl font-bold text-gold">1. Information We Collect</h3>
                </div>
                <p className="mb-4 text-gray-200">
                  We collect information to provide and improve our services, including personalized spiritual insights, voice interactions, and chat history. The types of information include:
                </p>
                <ul className="list-disc pl-6 space-y-3 mb-4 text-gray-200">
                  <li><strong className="text-gold">Personal Information:</strong> When you sign up or log in (via email, phone number, Google, Facebook, X (Twitter), or Instagram), we collect your name, email address, phone number, profile picture, and any linked social media data. For verification, we may collect OTP codes or device information.</li>
                  <li><strong className="text-gold">Usage Data:</strong> Automatically collected data such as IP address, device type, browser details, operating system, app interactions (e.g., searched verses, chat queries, selected themes like "love" or "compassion"), and timestamps. This helps us understand how you engage with features like Compare Mode or voice chat.</li>
                  <li><strong className="text-gold">Chat and Content Data:</strong> Your chat history, voice transcriptions (via Web Speech API), selected personas (e.g., Christian Priest or Islamic Mufti), and preferences for notifications or themes. We store this to maintain context-aware conversations and enable features like saving discussions.</li>
                  <li><strong className="text-gold">Voice and Audio Data:</strong> When using voice input, we process audio for transcription (not stored unless part of chat history). ElevenLabs integration handles text-to-speech, but no raw audio is retained beyond processing.</li>
                  <li><strong className="text-gold">Notification Preferences:</strong> Your opt-in choices for email/SMS updates on app features or spiritual insights.</li>
                </ul>
                <p className="text-sm text-gray-400 italic">
                  We do not collect sensitive religious data beyond what you voluntarily share in chats or preferences.
                </p>
              </section>

              {/* Section 2 */}
              <section className="mb-8">
                <div className="flex items-center mb-4">
                  <Eye className="w-6 h-6 text-purple-400 mr-3" />
                  <h3 className="text-2xl font-bold text-gold">2. How We Use Your Information</h3>
                </div>
                <p className="mb-4 text-gray-200">We use your data to operate and enhance Rellio:</p>
                <ul className="list-disc pl-6 space-y-3 mb-4 text-gray-200">
                  <li><strong className="text-gold">Provide Services:</strong> Deliver personalized AI responses, verse comparisons (e.g., verses on "love" from Quran, Bible, Torah, Bhagavad Gita, Vedas), voice chats, and scholar personas based on your selections.</li>
                  <li><strong className="text-gold">Improve the App:</strong> Analyze usage to refine features like real-time interruptions, auto-sending queries, or echo cancellation in voice mode.</li>
                  <li><strong className="text-gold">Notifications:</strong> Send app updates, daily verses, or personalized insights via email/SMS if opted in.</li>
                  <li><strong className="text-gold">Security and Compliance:</strong> Detect fraud, verify accounts (e.g., OTP), and comply with legal obligations.</li>
                  <li><strong className="text-gold">Analytics:</strong> Aggregate anonymous data to understand trends (e.g., popular themes like "meaning of life") without identifying individuals.</li>
                </ul>
                <p className="font-medium text-gray-300">
                  We do not sell your data. All processing is for the App's core functionality.
                </p>
              </section>

              {/* Section 3 */}
              <section className="mb-8">
                <div className="flex items-center mb-4">
                  <Users className="w-6 h-6 text-blue-400 mr-3" />
                  <h3 className="text-2xl font-bold text-gold">3. Sharing Your Information</h3>
                </div>
                <p className="mb-4 text-gray-200">We share data only as necessary:</p>
                <ul className="list-disc pl-6 space-y-3 mb-4 text-gray-200">
                  <li><strong className="text-gold">Service Providers:</strong> With trusted partners like Google (for auth), ElevenLabs (for voice synthesis), OpenAI/XAI (for AI responses), and Twilio/Nodemailer (for OTP/notifications). They are bound by confidentiality and process data only on our behalf.</li>
                  <li><strong className="text-gold">Legal Requirements:</strong> If required by law, subpoena, or to protect rights/safety.</li>
                  <li><strong className="text-gold">Business Transfers:</strong> In mergers/acquisitions, your data may transfer but remains subject to this Policy.</li>
                </ul>
                <p className="font-medium text-gray-300">
                  No sharing with third parties for marketing without consent.
                </p>
              </section>

              {/* Section 4 */}
              <section className="mb-8">
                <div className="flex items-center mb-4">
                  <Lock className="w-6 h-6 text-green-400 mr-3" />
                  <h3 className="text-2xl font-bold text-gold">4. Data Security</h3>
                </div>
                <p className="mb-4 text-gray-200">We use industry-standard measures:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-gray-200">
                  <li>Encryption (HTTPS, JWT tokens)</li>
                  <li>Secure storage (PostgreSQL with access controls)</li>
                  <li>Regular audits for vulnerabilities</li>
                  <li>Voice data is processed transiently and not stored long-term</li>
                </ul>
                <p className="text-sm text-gray-400 italic">
                  However, no system is 100% secure—use strong passwords and report issues.
                </p>
              </section>

              {/* Sections 5-10 in a more compact format */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <section className="p-6 bg-black/50 backdrop-blur border border-gold/20 rounded-lg">
                  <h3 className="text-xl font-bold text-gold mb-3 flex items-center">
                    <Shield className="w-5 h-5 text-gold mr-2" />
                    5. Your Rights and Choices
                  </h3>
                  <ul className="text-sm space-y-2 text-gray-200">
                    <li><strong className="text-gold">Access/Update/Delete:</strong> View, edit, or delete your data via app settings</li>
                    <li><strong className="text-gold">Opt-Out:</strong> Unsubscribe from notifications anytime</li>
                    <li><strong className="text-gold">GDPR/CCPA Compliance:</strong> EU/California residents have rights to access, rectify, erase, or port data</li>
                    <li><strong className="text-gold">Do Not Track:</strong> We honor browser DNT signals for analytics</li>
                  </ul>
                </section>

                <section className="p-6 bg-black/50 backdrop-blur border border-gold/20 rounded-lg">
                  <h3 className="text-xl font-bold text-gold mb-3 flex items-center">
                    <Users className="w-5 h-5 text-purple-400 mr-2" />
                    6. Children's Privacy
                  </h3>
                  <p className="text-sm text-gray-200">
                    Rellio is not intended for children under 13 (or 16 in some regions). We do not knowingly collect data from minors. If discovered, we delete it immediately.
                  </p>
                </section>

                <section className="p-6 bg-black/50 backdrop-blur border border-gold/20 rounded-lg">
                  <h3 className="text-xl font-bold text-gold mb-3 flex items-center">
                    <Globe className="w-5 h-5 text-blue-400 mr-2" />
                    7. International Data Transfers
                  </h3>
                  <p className="text-sm text-gray-200">
                    Data may be processed in the US or other countries with adequate protections (e.g., EU Standard Contractual Clauses).
                  </p>
                </section>

                <section className="p-6 bg-black/50 backdrop-blur border border-gold/20 rounded-lg">
                  <h3 className="text-xl font-bold text-gold mb-3 flex items-center">
                    <Clock className="w-5 h-5 text-green-400 mr-2" />
                    8. Data Retention
                  </h3>
                  <p className="text-sm text-gray-200">
                    We retain data as needed for services (e.g., chat history until deleted) or legal reasons, then securely delete it.
                  </p>
                </section>
              </div>

              {/* Final Sections */}
              <section className="mb-8 p-6 bg-gradient-to-r from-gold/20 to-purple-900/40 rounded-lg border-l-4 border-gold">
                <h3 className="text-xl font-bold text-gold mb-3">9. Changes to This Policy</h3>
                <p className="text-sm text-gray-200">
                  We'll notify you of material changes via app or email.
                </p>
              </section>

              <section className="mb-8 p-6 bg-gradient-to-r from-blue-900/40 to-teal-900/40 rounded-lg border-l-4 border-blue-400">
                <div className="flex items-center mb-3">
                  <Mail className="w-5 h-5 text-blue-400 mr-2" />
                  <h3 className="text-xl font-bold text-gold">10. Contact Us</h3>
                </div>
                <p className="text-sm mb-2 text-gray-200">
                  For questions or requests: <a href="mailto:support@rellio.com" className="text-gold underline hover:text-yellow-300">support@rellio.com</a>
                </p>
              </section>

              {/* Disclaimer */}
              <div className="text-center py-6 border-t border-gold/30">
                <p className="text-sm text-gray-400 italic">
                  By using Rellio, you acknowledge this Policy. For legal advice, consult a professional—this is not exhaustive.
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