import { ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import sacredScholarsImage from "@assets/sacred-scholars.jpg";
import sacredScholarsMobileImage from "@assets/sacred-scholars-mobile.jpg";

export default function ExperienceAIWisdom() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSacredScholars = () => {
    console.log("Ask Our Sacred Scholars clicked");
    // Future: Route to specialized scholar interface
  };

  const handleAIGuide = () => {
    console.log("Ask Our AI Guide clicked");
    // Future: Route to general AI guide
  };

  const handleBeginJourney = () => {
    console.log("Begin Your Sacred Journey clicked");
    // Future: Route to dashboard or signup
  };

  return (
    <section className="relative min-h-[900px] md:min-h-[800px] bg-gradient-to-b from-[#0c0f12] via-[#1a1d2e] to-[#0c0f12] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={isMobile ? sacredScholarsMobileImage : sacredScholarsImage}
          alt="Sacred scholars representing different religious traditions"
          className="w-full h-full object-contain opacity-95"
        />
        {/* Minimal overlay for text readability while keeping it see-through */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      {/* Content - Desktop: Centered overlay, Mobile: Below image */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Mobile: Image space */}
        <div className="md:hidden h-80" />
        
        {/* Content Container */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 md:py-0">
          <div className="max-w-4xl w-full">
            {/* Desktop: Backdrop for text overlay */}
            <div className="hidden md:block absolute inset-x-0 top-1/2 -translate-y-1/2 bg-black/10 backdrop-blur-xl border border-gold/50 rounded-2xl mx-4 lg:mx-auto lg:max-w-4xl">
              <div className="p-12 text-center">
                <h2 className="font-serif text-4xl lg:text-5xl tracking-[0.2em] text-gold mb-8 animate-bounce">
                  EXPERIENCE AI WISDOM
                </h2>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                  <button
                    onClick={handleSacredScholars}
                    className="inline-flex items-center justify-center rounded-lg border-2 border-gold/60 bg-transparent backdrop-blur-sm px-6 py-3 font-serif text-sm font-semibold tracking-[0.15em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/10 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold group"
                  >
                    ASK OUR SACRED SCHOLARS
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  
                  <button
                    onClick={handleAIGuide}
                    className="inline-flex items-center justify-center rounded-lg border-2 border-gold/60 bg-transparent backdrop-blur-sm px-6 py-3 font-serif text-sm font-semibold tracking-[0.15em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/10 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold group"
                  >
                    ASK OUR AI GUIDE
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>

                {/* Wisdom Content */}
                <div className="border border-gold/50 rounded-lg p-6 bg-black/5 backdrop-blur-xl">
                  <h3 className="font-serif text-lg text-gold mb-4 tracking-wide">
                    Q: What is the meaning of peace across religious traditions?
                  </h3>
                  <p className="text-text text-sm leading-relaxed">
                    <strong>A:</strong> Peace is a universal aspiration found in all religious teachings. The Hebrew word 'Shalom' 
                    represents complete wholeness and harmony. Islamic 'Salaam' conveys similar concepts of 
                    peace and submission to divine will. Hindu traditions speak of 'Shanti' – inner peace 
                    that comes from spiritual realization. Buddhist teachings emphasize inner peace through 
                    mindfulness and liberation from suffering.
                  </p>
                </div>

                {/* CTA Button */}
                <div className="mt-8">
                  <button
                    onClick={handleBeginJourney}
                    className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-gold/90 to-gold/80 backdrop-blur-sm px-8 py-3 font-serif text-sm font-semibold tracking-[0.2em] text-deep-indigo transition-all duration-300 hover:from-gold hover:to-gold/90 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold group"
                  >
                    BEGIN YOUR SACRED JOURNEY
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile: Content below image */}
            <div className="md:hidden bg-black/10 backdrop-blur-xl border border-gold/50 rounded-2xl p-8">
              <h2 className="font-serif text-3xl tracking-[0.2em] text-gold mb-6 text-center animate-bounce">
                EXPERIENCE AI WISDOM
              </h2>
              
              {/* Mobile Action Buttons */}
              <div className="space-y-3 mb-8">
                <button
                  onClick={handleSacredScholars}
                  className="w-full inline-flex items-center justify-center rounded-lg border-2 border-gold/60 bg-transparent backdrop-blur-sm px-6 py-3 font-serif text-sm font-semibold tracking-[0.15em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/10 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold group"
                >
                  ASK OUR SACRED SCHOLARS
                  <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                
                <button
                  onClick={handleAIGuide}
                  className="w-full inline-flex items-center justify-center rounded-lg border-2 border-gold/60 bg-transparent backdrop-blur-sm px-6 py-3 font-serif text-sm font-semibold tracking-[0.15em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/10 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold group"
                >
                  ASK OUR AI GUIDE
                  <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {/* Mobile Wisdom Content */}
              <div className="border border-gold/50 rounded-lg p-6 bg-black/5 backdrop-blur-xl mb-6">
                <h3 className="font-serif text-base text-gold mb-3 tracking-wide">
                  Q: What is the meaning of peace across religious traditions?
                </h3>
                <p className="text-text text-sm leading-relaxed">
                  <strong>A:</strong> Peace is a universal aspiration found in all religious teachings. The Hebrew word 'Shalom' 
                  represents complete wholeness and harmony. Islamic 'Salaam' conveys similar concepts of 
                  peace and submission to divine will. Hindu traditions speak of 'Shanti' – inner peace 
                  that comes from spiritual realization. Buddhist teachings emphasize inner peace through 
                  mindfulness and liberation from suffering.
                </p>
              </div>

              {/* Mobile CTA Button */}
              <div className="text-center">
                <button
                  onClick={handleBeginJourney}
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-gold/90 to-gold/80 backdrop-blur-sm px-8 py-3 font-serif text-sm font-semibold tracking-[0.2em] text-deep-indigo transition-all duration-300 hover:from-gold hover:to-gold/90 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold group"
                >
                  BEGIN YOUR SACRED JOURNEY
                  <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}