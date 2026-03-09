import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16 sm:py-20">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 mb-12 sm:mb-16">
          {/* Logo & Description */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14">
                <img 
                  src="/theramatemascot.png" 
                  alt="Theramate Mascot" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Theramate</h3>
                <p className="text-sm text-white">Connect • Heal • Grow</p>
              </div>
            </div>
            <p className="text-white text-base leading-relaxed">
              Empowering healthcare professionals with innovative therapy and wellness solutions. 
              Connect with qualified practitioners and transform your practice.
            </p>
          </div>

          {/* Essential Links */}
          <div>
            <h4 className="font-semibold mb-6 text-base sm:text-lg text-white">Quick Links</h4>
            <ul className="space-y-4 text-sm sm:text-base text-white">
              <li>
                <Link to="/contact" className="text-white hover:text-white/80 transition-colors duration-300">
                  For Companies
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-white hover:text-white/80 transition-colors duration-300">
                  Help Centre
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-white hover:text-white/80 transition-colors duration-300">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-white hover:text-white/80 transition-colors duration-300">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-white hover:text-white/80 transition-colors duration-300">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-white hover:text-white/80 transition-colors duration-300">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Mini FAQ for AI Crawlers */}
          <div>
            <h4 className="font-semibold mb-6 text-base sm:text-lg text-white">Quick Answers</h4>
            <div className="space-y-4 text-sm sm:text-base text-white">
              <div>
                <p className="font-medium text-white mb-1">Can I book a sports massage near me?</p>
                <p className="text-white">Yes, Theramate lets you search and book qualified sports massage therapists across the UK.</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Do you offer osteopathy for back pain?</p>
                <p className="text-white">Yes, you can book osteopaths online for posture correction, lower back pain, and injury recovery.</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">How do I know the therapists are qualified?</p>
                <p className="text-white">All professionals on Theramate are verified and accredited.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="border-t border-background/20 pt-6 sm:pt-8 pb-4 sm:pb-6 text-center">
        <div className="flex justify-center items-center gap-4 sm:gap-6 mb-3 sm:mb-4">
            <a 
              href="https://www.instagram.com/theramate_/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-white/80 transition-colors duration-300"
              aria-label="Follow us on Instagram"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a 
              href="https://www.tiktok.com/@theramate.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-white/80 transition-colors duration-300"
              aria-label="Follow us on TikTok"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </a>
          </div>
          <div className="text-xs sm:text-sm text-white">
            © 2025 Theramate. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};