import { motion } from "framer-motion";
import { ArrowRight, Heart, Shield, Clock, Search, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Analytics } from "@/lib/analytics";

export const HeroSectionClean = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    Analytics.trackEvent('hero_search_submit', { query: searchQuery });
    if (searchQuery.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/marketplace');
    }
  };

  return (
    <header className="relative pt-28 pb-16 px-6 overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-4xl">
          {/* Main headline with stagger animation */}
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-[1.05] text-slate-900 dark:text-white"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Book practitioners.{" "}
            <span className="bg-gradient-to-r from-wellness-500 to-primary bg-clip-text text-transparent">
              Feel better.
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            Find osteopaths, sports massage & sports therapists near you. Book instantly, recover faster.
          </motion.p>
        </div>

        {/* Search */}
        <motion.div 
          className="max-w-2xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className="relative flex items-center rounded-2xl bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border border-slate-200/60 dark:border-slate-700/50 px-5 py-1 focus-within:border-primary/30 transition-[border-color,background-color] duration-200 ease-out">
              <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 bg-transparent border-0 focus:outline-none focus:ring-0 text-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                placeholder="Search for practitioners, treatments or locations..."
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-[background-color,transform] duration-200 ease-out hover:scale-105"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </form>

          {/* Quick links */}
          <div className="flex flex-wrap items-center gap-6 mt-5">
            {[
              { label: "Osteopaths", href: "/marketplace?role=osteopath" },
              { label: "Sports Massage", href: "/marketplace?role=massage_therapist" },
              { label: "Sports Therapy", href: "/marketplace?role=sports_therapist" },
              { label: "Near Me", href: "/marketplace", icon: MapPin },
            ].map(({ label, href, icon: Icon }) => (
              <Link key={label} to={href}>
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300 tracking-tight hover:text-primary transition-colors cursor-pointer text-sm">
                  {Icon && <Icon className="w-4 h-4" />}
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Features - inline */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 pt-12 border-t border-slate-200/60 dark:border-slate-700/40"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        >
          <div className="flex items-start gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1 text-lg">Trusted Practitioners</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Connect with experienced practitioners who understand your needs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1 text-lg">Book Instantly</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Real-time availability. Book your session in seconds, not hours.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1 text-lg">Secure Payments</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Protected payments with full transparency. Pay only for what you book.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
};
