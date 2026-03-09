import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Search, CalendarCheck, Smile } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Find your therapist",
    description: "Search by location, specialty, or availability. Read reviews and choose the perfect match.",
  },
  {
    step: "02",
    icon: CalendarCheck,
    title: "Book instantly",
    description: "Select your time slot and book in seconds. No phone calls, no waiting for callbacks.",
  },
  {
    step: "03",
    icon: Smile,
    title: "Feel better",
    description: "Attend your session, get treated by a qualified professional, and start your recovery.",
  },
];

export const HowItWorksSection = () => {
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
      className="py-28 px-6 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-widest text-primary uppercase mb-3 block">
              How It Works
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              Three steps to feeling great.
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              No complex processes. Just simple, effective healthcare booking.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
            {/* Connection line (desktop only) */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  variants={itemVariants}
                  className="relative text-center"
                >
                  {/* Step number badge */}
                  <div className="relative z-10 mb-6">
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg shadow-primary/10 flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-700"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Icon className="w-8 h-8 text-primary" />
                    </motion.div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shadow-lg">
                      {index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
