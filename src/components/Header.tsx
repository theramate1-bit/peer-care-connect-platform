import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Badge } from "@/components/ui/badge";
import { Menu, User, CreditCard, Users, Shield, Calendar, FileText, BarChart3, Settings, Activity, Heart, Bone, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isClient, isPractitioner, getRoleDisplayName } from "@/types/roles";
import { RoleBasedNavigation } from "@/components/navigation/RoleBasedNavigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RealTimeNotifications } from "@/components/notifications/RealTimeNotifications";
import theramatemascot from "@/assets/theramatemascot.png";
import { useState, useEffect } from "react";

export const Header = () => {
  const { user, userProfile, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const userRole = userProfile?.user_role;
  const isClientUser = isClient(userRole);
  const isPractitionerUser = isPractitioner(userRole);

  // Get role-specific icon
  const getRoleIcon = () => {
    switch (userProfile?.user_role) {
      case 'client':
        return <Heart className="h-5 w-5 text-primary" />;
      case 'sports_therapist':
        return <Activity className="h-5 w-5 text-primary" />;
      case 'massage_therapist':
        return <Heart className="h-5 w-5 text-primary" />;
      case 'osteopath':
        return <Bone className="h-5 w-5 text-primary" />;
      default:
        return <Users className="h-5 w-5 text-primary" />;
    }
  };

  // Get role-specific title
  const getRoleTitle = () => {
    switch (userProfile?.user_role) {
      case 'client':
        return 'Client Portal';
      case 'sports_therapist':
        return 'Sports Therapy Portal';
      case 'massage_therapist':
        return 'Massage Therapy Portal';
      case 'osteopath':
        return 'Osteopathy Portal';
      default:
        return 'Professional Portal';
    }
  };

  // Get navigation items based on user role
  const getNavigationItems = () => {
    if (!user) {
      return [
        { label: "Marketplace", path: "/marketplace", icon: Users },
        { label: "How It Works", path: "/how-it-works", icon: null },
        { label: "Pricing", path: "/pricing", icon: null },
        { label: "About Us", path: "/about", icon: null },
        { label: "Help", path: "/help", icon: null },
      ];
    }

    // For authenticated users, use role-based navigation
    return [];
  };

  const navigationItems = getNavigationItems();

  return (
    <header className={`bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50 ${
      isClientUser ? 'bg-green-50/95 border-green-200' : isPractitionerUser ? 'bg-blue-50/95 border-blue-200' : ''
    }`}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 lg:py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12">
              <img 
                src={theramatemascot} 
                alt="TheraMate Mascot" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-bold text-foreground">TheraMate</h1>
              <p className={`text-xs sm:text-sm text-muted-foreground ${
                isClientUser ? 'text-green-600' : isPractitionerUser ? 'text-blue-600' : ''
              }`}>
                {isClientUser ? 'Client Portal' : isPractitionerUser ? `${getRoleDisplayName(userRole)} Portal` : 'Connect • Heal • Grow'}
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-base font-bold text-foreground">TheraMate</h1>
            </div>
          </Link>

          {/* Role-Based Navigation */}
          {user ? (
            <RoleBasedNavigation variant="header" className="hidden md:flex" />
          ) : (
            <nav className="hidden md:flex items-center gap-1">
              {navigationItems.map((item, index) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {item.icon && <item.icon className="w-4 h-4" />}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Role-Based User Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <>
                {/* Notifications */}
                <div className="hidden sm:flex items-center gap-2">
                  <RealTimeNotifications />
                </div>
                
                {/* Mobile notifications only */}
                <div className="sm:hidden">
                  <RealTimeNotifications />
                </div>
                
                {/* Role-specific user info */}
                <div className="hidden lg:flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    {getRoleIcon()}
                    <div className="text-sm">
                      <div className="font-medium">{userProfile?.first_name}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/profile">
                      {getRoleTitle()}
                    </Link>
                  </Button>
                </div>
                
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs sm:text-sm">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                {/* Simplified CTAs */}
                <Link to="/login">
                  <Button variant="outline" size="default" className="text-xs sm:text-sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="default" className="text-xs sm:text-sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
            
            {/* Mobile menu */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden ml-1 w-8 h-8 sm:w-10 sm:h-10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm">
            <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
              {!user ? (
                <>
                  {/* Public navigation for mobile */}
                  {navigationItems.map((item, index) => {
                    const isActive = location.pathname === item.path || 
                      (item.path !== '/' && location.pathname.startsWith(item.path));
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors flex items-center gap-3 ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.icon && <item.icon className="w-5 h-5" />}
                        {item.label}
                      </Link>
                    );
                  })}
                  
                  <div className="pt-6 border-t border-border space-y-6">
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full h-12 text-base">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full h-12 text-base">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  {/* Authenticated user mobile menu */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      {getRoleIcon()}
                      <div className="text-base">
                        <div className="font-medium">{userProfile?.first_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getRoleTitle()}
                        </div>
                      </div>
                    </div>
                    
                    <RoleBasedNavigation variant="mobile" className="space-y-3" />
                    
                    <div className="pt-6 border-t border-border">
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          handleSignOut();
                          setIsMobileMenuOpen(false);
                        }} 
                        className="w-full justify-start h-12 text-base"
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};