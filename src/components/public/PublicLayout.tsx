import { ReactNode, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { theramatemascot } from "@/assets/theramatemascot.png";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Public Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10">
                <img
                  src="/src/assets/theramatemascot.png"
                  alt="TheraMate Mascot"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-xl">TheraMate</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-sm font-medium hover:text-primary">Home</Link>
              <Link to="/marketplace" className="text-sm font-medium hover:text-primary">Marketplace</Link>
              <Link to="/how-it-works" className="text-sm font-medium hover:text-primary">How It Works</Link>
              <Link to="/pricing" className="text-sm font-medium hover:text-primary">Pricing</Link>
              <Link to="/about" className="text-sm font-medium hover:text-primary">About</Link>
              <Link to="/help" className="text-sm font-medium hover:text-primary">Help</Link>
            </nav>
            
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/login">
                <Button variant="outline" className="px-6">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button className="px-6">Get Started</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div ref={mobileMenuRef} className="md:hidden border-t bg-background animate-in slide-in-from-top-2 duration-200">
              <nav className="flex flex-col space-y-4 py-4">
                <Link 
                  to="/" 
                  className="text-sm font-medium hover:text-primary px-4 py-2"
                  onClick={closeMobileMenu}
                >
                  Home
                </Link>
                <Link 
                  to="/marketplace" 
                  className="text-sm font-medium hover:text-primary px-4 py-2"
                  onClick={closeMobileMenu}
                >
                  Marketplace
                </Link>
                <Link 
                  to="/how-it-works" 
                  className="text-sm font-medium hover:text-primary px-4 py-2"
                  onClick={closeMobileMenu}
                >
                  How It Works
                </Link>
                <Link 
                  to="/pricing" 
                  className="text-sm font-medium hover:text-primary px-4 py-2"
                  onClick={closeMobileMenu}
                >
                  Pricing
                </Link>
                <Link 
                  to="/about" 
                  className="text-sm font-medium hover:text-primary px-4 py-2"
                  onClick={closeMobileMenu}
                >
                  About
                </Link>
                <Link 
                  to="/help" 
                  className="text-sm font-medium hover:text-primary px-4 py-2"
                  onClick={closeMobileMenu}
                >
                  Help
                </Link>
                
                {/* Mobile Auth Buttons */}
                <div className="flex flex-col space-y-4 px-4 pt-6 border-t">
                  <Link to="/login" onClick={closeMobileMenu}>
                    <Button variant="outline" className="w-full h-12">Sign In</Button>
                  </Link>
                  <Link to="/register" onClick={closeMobileMenu}>
                    <Button className="w-full h-12">Get Started</Button>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Public Footer */}
      <footer className="bg-primary text-primary-foreground mt-auto">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10">
                  <img
                    src="/src/assets/theramatemascot.png"
                    alt="TheraMate Mascot"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-bold text-xl">TheraMate</span>
              </div>
              <p className="text-sm text-primary-foreground/80">
                Connect • Heal • Grow
              </p>
              <p className="text-sm text-primary-foreground/80">
                Empowering healthcare professionals with innovative therapy and wellness solutions.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/marketplace" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    Marketplace
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/about" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    Contact
                  </Link>
                </li>
                <li>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/terms" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
            <p className="text-sm text-primary-foreground/70">
              © {new Date().getFullYear()} TheraMate. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
