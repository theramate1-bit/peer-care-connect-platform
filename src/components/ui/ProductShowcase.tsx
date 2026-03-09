import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Search, FileText, TrendingUp, Zap, Users, Stethoscope, Heart, Activity, Clock, CheckCircle } from "lucide-react";

const features = [
  {
    id: "booking",
    icon: CalendarDays,
    title: "Smart Booking",
    description: "Intelligent appointment scheduling with qualified healthcare professionals",
    image: "📅",
    details: [
      "AI-powered practitioner matching",
      "Seamless calendar integration", 
      "Real-time availability updates",
      "Automated check-in/check-out"
    ],
    color: "from-blue-500 to-blue-600"
  },
  {
    id: "marketplace",
    icon: Search,
    title: "Intelligent Matching",
    description: "Advanced discovery system for osteopaths, sports therapists, and massage therapists",
    image: "🎯",
    details: [
      "Smart location-based filtering",
      "Detailed practitioner profiles",
      "Verified qualifications & reviews",
      "Personalized recommendations"
    ],
    color: "from-wellness-500 to-wellness-600"
  },
  {
    id: "notes",
    icon: FileText,
    title: "Secure Communication",
    description: "Protected messaging and documentation system for healthcare professionals",
    image: "🔒",
    details: [
      "End-to-end encrypted messaging",
      "Secure file sharing",
      "HIPAA-compliant documentation",
      "Real-time collaboration tools"
    ],
    color: "from-purple-500 to-purple-600"
  },
  {
    id: "analytics",
    icon: TrendingUp,
    title: "Progress Analytics",
    description: "Advanced insights and tracking for healthcare practitioners",
    image: "📈",
    details: [
      "Real-time performance metrics",
      "Client progress visualization",
      "Predictive analytics dashboard",
      "Automated reporting"
    ],
    color: "from-orange-500 to-orange-600"
  }
];

export const ProductShowcase = () => {
  const [activeTab, setActiveTab] = useState("booking");
  const activeFeature = features.find(f => f.id === activeTab);

  return (
    <section className="py-20 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 h-min-content">
        {/* Header */}
        <motion.div
          className="text-center max-w-4xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground via-wellness-600 to-primary bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Built for Healthcare Professionals
          </motion.h2>
          <motion.p 
            className="text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            Connect with clients, manage sessions, and grow your practice with our comprehensive healthcare platform
          </motion.p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Feature Tabs */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="space-y-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = activeTab === feature.id;
                
                return (
                  <motion.button
                    key={feature.id}
                    onClick={() => setActiveTab(feature.id)}
                    className={`w-full p-6 rounded-2xl text-left transition-[border-color,background-color] duration-200 ease-out relative overflow-hidden group will-change-transform ${
                      isActive 
                        ? 'bg-gradient-to-r from-wellness-500/10 to-primary/10 border-2 border-wellness-400/30 shadow-depth-1' 
                        : 'bg-card/50 border border-border/50 hover:border-wellness-400/20'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    {/* Animated background for active tab */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-wellness-500/5 to-primary/5"
                        layoutId="activeTab"
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    
                    {/* Animated border for active tab */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 border-2 border-wellness-400/30 rounded-2xl"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}

                    <div className="relative flex items-start gap-4">
                      <motion.div 
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isActive 
                            ? 'bg-gradient-to-br from-wellness-500 to-primary text-white shadow-lg' 
                            : 'bg-muted text-muted-foreground group-hover:bg-wellness-500/20 group-hover:text-wellness-600'
                        } transition-[border-color,background-color] duration-200 ease-out`}
                        whileHover={{ rotate: isActive ? 0 : 10 }}
                        animate={{ rotate: isActive ? 360 : 0 }}
                        transition={{ duration: isActive ? 0.6 : 0.3 }}
                      >
                        <Icon className="w-6 h-6" />
                      </motion.div>
                      
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-2 transition-colors ${
                          isActive ? 'text-wellness-600' : 'text-foreground group-hover:text-wellness-600'
                        }`}>
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>

                      {/* Active indicator */}
                      <motion.div
                        className={`w-3 h-3 rounded-full transition-[background-color] duration-200 ease-out ${
                          isActive ? 'bg-wellness-500 shadow-lg' : 'bg-transparent'
                        }`}
                        animate={{ 
                          scale: isActive ? [1, 1.2, 1] : 1,
                          boxShadow: isActive 
                            ? ["0 0 0 rgba(34, 197, 94, 0.5)", "0 0 20px rgba(34, 197, 94, 0.8)", "0 0 0 rgba(34, 197, 94, 0.5)"]
                            : "none"
                        }}
                        transition={{ 
                          scale: { duration: 2, repeat: Infinity },
                          boxShadow: { duration: 2, repeat: Infinity }
                        }}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Feature Display */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <AnimatePresence mode="wait">
              {activeFeature && (
                <motion.div
                  key={activeFeature.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="relative"
                >
                  {/* Feature card */}
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-card to-card/80 border border-border/50 shadow-depth-2 overflow-hidden will-change-transform">
                    {/* Background pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(34,197,94,0.05)_1px,transparent_1px),linear-gradient(-45deg,rgba(34,197,94,0.05)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30" />
                    
                    {/* Feature icon/image */}
                    <motion.div 
                      className="text-8xl mb-6 text-center"
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      {activeFeature.image}
                    </motion.div>

                    {/* Feature details */}
                    <motion.h3 
                      className="text-2xl font-bold mb-4 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {activeFeature.title}
                    </motion.h3>

                    <motion.p 
                      className="text-muted-foreground mb-6 text-center leading-relaxed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {activeFeature.description}
                    </motion.p>

                    {/* Feature list */}
                    <motion.div 
                      className="space-y-3 mb-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      {activeFeature.details.map((detail, index) => (
                        <motion.div
                          key={detail}
                          className="flex items-center gap-3"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                        >
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-wellness-500 to-primary" />
                          <span className="text-sm text-muted-foreground">{detail}</span>
                        </motion.div>
                      ))}
                    </motion.div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
