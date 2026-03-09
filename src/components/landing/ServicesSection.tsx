import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { 
  Bone, 
  Dumbbell, 
  Hand, 
  ArrowRight,
  CheckCircle
} from "lucide-react";

const services = [
  {
    id: "osteopath",
    icon: Bone,
    title: "Osteopathy",
    description: "Holistic treatment for back pain, posture issues, and musculoskeletal conditions.",
    features: ["Back & neck pain relief", "Posture correction", "Joint mobility", "Injury recovery"],
    color: "from-violet-500 to-purple-600",
    href: "/marketplace?specialty=osteopath",
  },
  {
    id: "sports-massage",
    icon: Hand,
    title: "Sports Massage",
    description: "Deep tissue and therapeutic massage for muscle recovery and tension relief.",
    features: ["Muscle tension release", "Pre/post workout care", "Injury prevention", "Relaxation"],
    color: "from-emerald-500 to-teal-600",
    href: "/marketplace?specialty=sports_massage",
  },
  {
    id: "sports-therapy",
    icon: Dumbbell,
    title: "Sports Therapy",
    description: "Specialized treatment for sports injuries, rehabilitation and performance.",
    features: ["Sports injuries", "Rehabilitation", "Performance optimization", "Movement analysis"],
    color: "from-orange-500 to-red-500",
    href: "/marketplace?specialty=sports_therapist",
  },
];

export const ServicesSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "0px", amount: 0.1 });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <section ref={sectionRef} className="py-28 px-6 overflow-hidden bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-16">
            <span className="text-xs font-bold tracking-widest text-primary uppercase mb-3 block">
              Our Services
            </span>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
                  Expert care for every need.
                </h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl">
                  From chronic pain to sports performance — find the right specialist for your journey to better health.
                </p>
              </div>
              <Link 
                to="/marketplace" 
                className="group flex items-center gap-2 font-semibold text-primary whitespace-nowrap"
              >
                View all therapists
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.id}
                  variants={itemVariants}
                  className="group"
                >
                  <Link to={service.href}>
                    <div className="relative h-full p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-[border-color,background-color] duration-200 ease-out overflow-hidden">
                      {/* Background gradient on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                      
                      {/* Icon */}
                      <div className="relative mb-6">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 shadow-lg`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                      </div>

                      {/* Content */}
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        {service.description}
                      </p>

                      {/* Features */}
                      <ul className="space-y-2">
                        {service.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <CheckCircle className="w-4 h-4 text-primary/60" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {/* Arrow indicator */}
                      <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-[background-color] duration-200 ease-out">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
