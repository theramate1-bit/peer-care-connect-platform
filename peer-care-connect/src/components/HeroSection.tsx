import { motion, useScroll, useTransform } from "framer-motion";
import { Heart, Users, CalendarDays, Shield, Sparkles, Zap, Target, Activity, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { StarsBackground } from "@/components/ui/StarsBackground";
import { useMousePosition } from "@/hooks/useMousePosition";
import { useMobile } from "@/hooks/use-mobile";
import heroVideo from "@/assets/hero.mp4";
import heroImage from "@/assets/hero-wellness.jpg";
import { Analytics } from "@/lib/analytics";

export const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isMobile } = useMobile();
  const { scrollY } = useScroll();
  const mousePosition = useMousePosition();
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  
  // Parallax transforms
  const yBg = useTransform(scrollY, [0, 1000], [0, -300]);
  const yContent = useTransform(scrollY, [0, 1000], [0, -100]);
  const rotate = useTransform(scrollY, [0, 1000], [0, 360]);

  // Intersection Observer to load video only when in viewport
  useEffect(() => {
    if (isMobile) {
      // For mobile, don't load video at all
      return;
    }
    
    // Check if section is already visible (for landing page)
    if (sectionRef.current) {
      const rect = sectionRef.current.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (isVisible) {
        setShouldLoadVideo(true);
        return;
      }
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoadVideo(true);
            // Unobserve after loading starts to avoid re-triggering
            if (sectionRef.current) {
              observer.unobserve(sectionRef.current);
            }
          }
        });
      },
      { threshold: 0.1 } // Start loading when 10% visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [isMobile]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoadVideo) return;

    // Load video source when it should be loaded
    video.load();

    // Mobile-specific video handling with smooth looping
    const handleVideoPlay = async () => {
      try {
        await video.play();
        setVideoLoaded(true);
        
        // Set up smooth loop with fade transition
        video.addEventListener('ended', () => {
          // Add a subtle fade effect before restarting
          video.style.transition = 'opacity 0.5s ease-in-out';
          video.style.opacity = '0.8';
          
          setTimeout(() => {
            video.currentTime = 0;
            video.style.opacity = '1';
            video.play();
          }, 250);
        });

        // Ensure smooth playback
        video.addEventListener('canplaythrough', () => {
          video.style.transition = 'opacity 0.3s ease-in-out';
          setVideoLoaded(true);
        });

      } catch (error) {
        console.log('Video autoplay failed, showing fallback image');
        // Show fallback image if video fails to play
        const fallback = document.getElementById('hero-fallback');
        if (fallback) {
          fallback.style.opacity = '1';
        }
        video.style.display = 'none';
      }
    };

    // Try to play video after a short delay to ensure it's loaded
    const timer = setTimeout(handleVideoPlay, 100);

    return () => clearTimeout(timer);
  }, [shouldLoadVideo]);

  return (
    <motion.section 
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900"
      style={{ minHeight: '100vh' }}
    >
      {/* Video Background with Space Theme Overlay */}
      <motion.div 
        className="absolute inset-0 w-full h-full"
        style={{ y: yBg }}
      >
        {/* Video Background */}
        {!isMobile ? (
          <>
            {/* Show poster image initially and while video loads */}
            <img 
              src={heroImage} 
              alt="TheraMate" 
              width={1200} 
              height={800} 
              className="absolute inset-0 w-full h-full will-change-transform transition-opacity duration-500"
              style={{ 
                minHeight: '120vh',
                height: '120vh',
                objectFit: 'cover',
                objectPosition: 'center',
                opacity: videoLoaded ? 0 : 1,
                zIndex: videoLoaded ? 0 : 1
              }}
            />
            {/* Load video only when in viewport */}
            {shouldLoadVideo && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                loop
                preload="none"
                poster={heroImage}
                className="absolute inset-0 w-full h-full will-change-transform transition-opacity duration-500"
                style={{ 
                  minHeight: '120vh',
                  height: '120vh',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  opacity: videoLoaded ? 1 : 0,
                  zIndex: videoLoaded ? 1 : 0
                }}
                onLoadedData={() => setVideoLoaded(true)}
                onCanPlay={() => setVideoLoaded(true)}
                onError={(e) => {
                  const videoElement = e.target as HTMLVideoElement;
                  videoElement.style.display = 'none';
                  const fallback = document.getElementById('hero-fallback');
                  if (fallback) {
                    (fallback as HTMLDivElement).style.opacity = '1';
                  }
                }}
              >
                <source src={heroVideo} type="video/mp4" />
              </video>
            )}
          </>
        ) : (
          <img 
            src={heroImage} 
            alt="TheraMate" 
            width={1200} 
            height={800} 
            className="absolute inset-0 w-full h-full"
            style={{ 
              minHeight: '120vh',
              height: '120vh',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
        )}

        {/* Fallback image for when video fails to load */}
        {!isMobile && (
          <div 
            className={`absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-opacity duration-500 opacity-0`}
            style={{ 
              backgroundImage: `url(${heroImage})`,
              minHeight: '120vh',
              height: '120vh',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            id="hero-fallback"
          />
        )}

        {/* Space Theme Overlay */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900/40 via-primary/10 to-wellness-900/40" style={{ minHeight: '120vh', height: '120vh' }}>
          {/* Stars Background */}
          <StarsBackground density={100} />
          
          {/* Central Planet/Orb */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-96 h-96 opacity-15"
            style={{
              x: "-50%",
              y: "-50%",
              rotate: rotate
            }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-wellness-400/20 to-primary/20 blur-3xl" />
          </motion.div>

          {/* Orbital Rings */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-[600px] h-[600px] border border-wellness-400/5 rounded-full"
            style={{
              x: "-50%",
              y: "-50%",
              rotate: rotate
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-[800px] h-[800px] border border-primary/5 rounded-full"
            style={{
              x: "-50%",
              y: "-50%",
              rotate: useTransform(rotate, r => -r * 0.7)
            }}
          />

          {/* Mouse-following gradient */}
          <motion.div
            className="absolute w-96 h-96 rounded-full opacity-5 pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)",
              x: mousePosition.x - 192,
              y: mousePosition.y - 192,
            }}
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 w-full h-full bg-[linear-gradient(rgba(34,197,94,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.05)_1px,transparent_1px)] bg-[size:100px_100px] opacity-20" style={{ minHeight: '120vh', height: '120vh' }} />

      {/* Main Gradient Overlay */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-black/20 to-black/60" style={{ minHeight: '120vh', height: '120vh' }} />

      {/* Main Content */}
      <motion.div 
        className="relative z-10 text-center max-w-6xl mx-auto px-4 sm:px-8 will-change-transform"
        style={{ y: yContent }}
      >
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <motion.div 
            className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-wellness-500/20 to-primary/20 border border-wellness-400/30 backdrop-blur-sm text-white"
            whileHover={{ scale: 1.05 }}
            animate={{
              boxShadow: [
                "0 0 20px rgba(34, 197, 94, 0.2)",
                "0 0 40px rgba(34, 197, 94, 0.3)",
                "0 0 20px rgba(34, 197, 94, 0.2)"
              ]
            }}
            transition={{
              boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            <span className="font-medium">Trusted Healthcare Platform</span>
          </motion.div>
        </motion.div>
        
        {/* Main Heading with Stagger Animation */}
        <motion.h1 
          className="font-bold text-white mb-8 leading-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <motion.span
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="block bg-gradient-to-r from-white via-wellness-100 to-white bg-clip-text text-transparent"
          >
            Book Osteopaths,
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="block bg-gradient-to-r from-white via-wellness-200 to-white bg-clip-text text-transparent drop-shadow-lg"
          >
            Sports Massage & Sports Therapists
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="block text-white"
          >
            Online
          </motion.span>
        </motion.h1>
        
        {/* Description */}
        <motion.h2 
          className="text-white mb-12 max-w-3xl mx-auto leading-relaxed text-lg sm:text-xl md:text-2xl font-light drop-shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          Fast, trusted, and local treatment for back pain, sports injuries, posture correction and recovery.
        </motion.h2>

        {/* Action Buttons */}
        <motion.div 
          className="flex gap-6 place-content-center mb-16 flex-col sm:flex-row will-change-transform"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          <Link to="/marketplace" className="w-full sm:w-auto">
            <AnimatedButton 
              variant="glow"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => Analytics.trackEvent('cta_browse_therapists_click')}
            >
              <CalendarDays className="w-6 h-6 mr-3" />
              Browse Therapists
              <Zap className="w-5 h-5 ml-2" />
            </AnimatedButton>
          </Link>
          <Link to="/register" className="w-full sm:w-auto">
            <AnimatedButton 
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => Analytics.trackEvent('cta_get_started_click')}
            >
              <Heart className="w-6 h-6 mr-3" />
              Get Started Free
            </AnimatedButton>
          </Link>
        </motion.div>


        {/* Animated Stats */}
        <motion.div 
          className="grid gap-8 max-w-4xl mx-auto grid-cols-2 md:grid-cols-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.4 }}
        >
          {[
            { number: "500+", label: "Active Therapists" },
            { number: "4.9★", label: "Average Rating" },
            { number: "10K+", label: "Happy Clients" },
            { number: "50K+", label: "Sessions Booked" }
          ].map((stat, index) => (
            <motion.div 
              key={stat.label}
              className="text-center group"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.6 + index * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg"
                animate={{ 
                  textShadow: [
                    "0 0 10px rgba(255, 255, 255, 0.8)",
                    "0 0 20px rgba(255, 255, 255, 1)",
                    "0 0 10px rgba(255, 255, 255, 0.8)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {stat.number}
              </motion.div>
              <div className="text-sm text-white/70 font-light group-hover:text-white/90 transition-colors">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.section>
  );
};