import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, Clock, Users } from "lucide-react";

// Animated counter component
function AnimatedNumber({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px", amount: 0.1 });

  const runAnimation = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    intervalRef.current = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
  };

  useEffect(() => {
    if (isInView) runAnimation();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isInView, value]);

  // Mobile fallback
  useEffect(() => {
    const fallback = setTimeout(() => {
      if (startedRef.current || count > 0) return;
      if (typeof window === "undefined" || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const inViewport = rect.top < vh && rect.bottom > 0;
      if (inViewport) runAnimation();
    }, 500);
    return () => clearTimeout(fallback);
  }, [value, count]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

export const ImpactSection = () => {
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
    <section ref={sectionRef} className="py-24 px-6 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          {/* Left side - Stats */}
          <div className="space-y-12">
            <motion.div variants={itemVariants}>
              <span className="text-xs font-bold tracking-widest text-primary uppercase">The Problem</span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mt-3 text-slate-900 dark:text-white">
                Pain is everywhere.
              </h2>
            </motion.div>

            <div className="space-y-10">
              <motion.div variants={itemVariants} className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl md:text-6xl font-black text-primary">
                    <AnimatedNumber value={20} suffix="M+" />
                  </span>
                </div>
                <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
                  People in the UK live with a musculoskeletal condition
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white">
                    <AnimatedNumber value={28} suffix="M" />
                  </span>
                  <span className="text-xl font-medium text-slate-500 dark:text-slate-400">days</span>
                </div>
                <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
                  Working days lost each year to back pain alone
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white">
                    1 in 4
                  </span>
                </div>
                <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
                  Adults in the UK are affected at any given time
                </p>
              </motion.div>
            </div>

            {/* Source citation */}
            <motion.p variants={itemVariants} className="text-xs text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-700">
              Source: Versus Arthritis & NHS England — Musculoskeletal Health Report
            </motion.p>
          </div>

          {/* Right side - Problem visualization */}
          <motion.div
            variants={itemVariants}
            className="relative"
          >
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-10 shadow-xl border border-slate-200 dark:border-slate-700">
              {/* Problem cards */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold tracking-widest text-red-500 uppercase">Why This Matters</span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">The Hidden Cost of Pain</h3>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Long NHS Wait Times</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Average wait for physio on NHS is 12+ weeks — pain shouldn't have to wait.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Impacts Daily Life</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Back pain is the leading cause of disability worldwide according to WHO.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Hard to Find Help</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Finding trusted, local practitioners shouldn't be complicated.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Solution teaser */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-600">
                  <p className="text-center text-slate-500 dark:text-slate-400 font-medium">
                    That's why we built <span className="text-primary font-bold">Theramate</span> — to connect you with help, fast.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
