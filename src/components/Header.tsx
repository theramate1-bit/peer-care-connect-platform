import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Badge } from "@/components/ui/badge";
import { Menu, User as UserIcon, Users, X, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isClient, isPractitioner } from "@/types/roles";
import { RoleBasedNavigation } from "@/components/navigation/RoleBasedNavigation";
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare } from 'lucide-react';
import { RealTimeNotifications } from '@/components/notifications/RealTimeNotifications';
import theramatemascot from '@/assets/theramatemascot.png';

export const Header = () => {
  const { user, userProfile, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const handleSignOut = async () => {
    await signOut();
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('message_status_tracking')
          .select('*')
          .eq('recipient_id', user.id)
          .eq('message_status', 'delivered');

        if (error) throw error;
        setUnreadMessageCount(data?.length || 0);
      } catch (error) {
        // Silently handle unread message fetch errors
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('unread-messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_status_tracking',
        filter: `recipient_id=eq.${user.id}`
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const userRole = userProfile?.user_role;
  const isClientUser = isClient(userRole);
  const isPractitionerUser = isPractitioner(userRole);

  // Get role-specific title
  const getRoleTitle = () => {
    switch (userProfile?.user_role) {
      case 'client':
        return 'TheraMate';
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

  // Get role-specific icon
  const getRoleIcon = () => {
    if (isClientUser) {
      return <UserIcon className="h-8 w-8 text-primary" />;
    }
    return <UserIcon className="h-8 w-8 text-primary" />;
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
    <>
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
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
              <h1 className="text-lg sm:text-xl font-bold text-foreground">TheraMate.</h1>
            </div>
            <div className="sm:hidden">
              <h1 className="text-base font-bold text-foreground">TheraMate.</h1>
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
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            {user ? (
              <>
                {/* Desktop notifications */}
                <div className="hidden md:flex items-center gap-2">
                  <RealTimeNotifications />
                </div>
                
                {/* Desktop user actions - hidden on mobile */}
                <div className="hidden md:flex items-center gap-2">
                  <Link to={isClientUser ? "/client/messages" : "/messages"}>
                    <Button variant="ghost" size="sm" className="text-sm relative">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Messages
                      {unreadMessageCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs">
                          {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  
                  {!isClientUser && (
                    <Link to="/profile">
                      <Button variant="ghost" size="sm" className="text-sm">
                        <UserIcon className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                  )}
                  
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-sm">
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Desktop CTAs - hidden on mobile */}
                <div className="hidden md:flex items-center gap-3">
                  <Link to="/login">
                    <Button variant="outline" size="default" className="text-sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="default" className="text-sm">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </>
            )}
            
            {/* Mobile menu button - visible on mobile and tablet */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="flex md:hidden w-10 h-10 min-w-[40px] min-h-[40px]"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm overflow-hidden"
            >
              <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-3 sm:space-y-4">
                {!user ? (
                  <>
                    {/* Public navigation for mobile */}
                    <nav className="space-y-2" role="navigation" aria-label="Mobile navigation">
                      {navigationItems.map((item, index) => {
                        const isActive = location.pathname === item.path || 
                          (item.path !== '/' && location.pathname.startsWith(item.path));
                        
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] ${
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {item.icon && <item.icon className="w-5 h-5 flex-shrink-0" />}
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </nav>
                    
                    <div className="pt-6 border-t border-border space-y-6">
                      <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block">
                        <Button variant="outline" className="w-full h-12 text-base font-medium rounded-full">
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="block">
                        <Button className="w-full h-12 text-base font-medium rounded-full">
                          Get Started
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Authenticated user mobile menu */}
                    <div className="space-y-4">
                      {/* User info header */}
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                        {getRoleIcon()}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base truncate">{userProfile?.first_name} {userProfile?.last_name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {getRoleTitle()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Navigation items */}
                      <RoleBasedNavigation variant="mobile" className="space-y-2" />
                      
                      {/* Sign Out */}
                      <div className="pt-4 border-t border-border">
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            handleSignOut();
                            setIsMobileMenuOpen(false);
                          }} 
                          className="w-full justify-start h-12 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <LogOut className="w-5 h-5 mr-3" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
    </>
  );
};


