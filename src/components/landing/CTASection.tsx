import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Sparkles } from "lucide-react";
import { Analytics } from "@/lib/analytics";

export const CTASection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "0px", amount: 0.1 });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <section 
      ref={sectionRef} 
      className="py-32 px-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="max-w-4xl mx-auto text-center space-y-8"
      >
        {/* Badge */}
        <motion.div variants={itemVariants}>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Start your wellness journey
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          variants={itemVariants}
          className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white"
        >
          Ready to feel your best?
        </motion.h2>
        
        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto"
        >
          Whether you need relief from pain, recovery from injury, or just want to invest in your wellbeing — find your therapist today.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center pt-6"
        >
          <Link to="/marketplace">
            <motion.button
              className="px-8 py-4 bg-primary text-white font-bold rounded-full tracking-wide hover:scale-105 transition-[background-color,transform] duration-200 ease-out flex items-center justify-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => Analytics.trackEvent('cta_find_therapist_click')}
            >
              <CalendarDays className="w-5 h-5" />
              Find a Therapist
            </motion.button>
          </Link>
          <Link to="/register">
            <motion.button
              className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-full tracking-wide border-2 border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-[border-color,background-color] duration-200 ease-out"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => Analytics.trackEvent('cta_register_click')}
            >
              Create Free Account
            </motion.button>
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div 
          variants={itemVariants}
          className="pt-8 text-sm text-slate-500 dark:text-slate-400"
        >
          <span>
            Join <strong className="text-slate-700 dark:text-slate-200">hundreds</strong> of clients who found their perfect therapist
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
};
