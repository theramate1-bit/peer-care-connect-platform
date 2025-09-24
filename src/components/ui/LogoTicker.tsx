import { motion } from "framer-motion";

const partnerships = [
  { name: "Osteopaths", logo: "🦴" },
  { name: "Sports Therapists", logo: "🏃‍♂️" },
  { name: "Massage Therapists", logo: "💆‍♀️" },
  { name: "Healthcare Professionals", logo: "👩‍⚕️" },
  { name: "Sports Clubs", logo: "⚽" },
  { name: "Wellness Centers", logo: "🧘" },
  { name: "Private Practices", logo: "🏢" },
  { name: "Rehabilitation Centers", logo: "🏥" },
];

export const LogoTicker = () => {
  // Double the array for seamless looping
  const extendedLogos = [...partnerships, ...partnerships];

  return (
    <section className="py-16 bg-gradient-to-r from-muted/50 via-background to-muted/50 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <motion.h2 
          className="text-3xl font-bold text-center mb-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Supporting Healthcare Professionals
        </motion.h2>
        <motion.p 
          className="text-muted-foreground text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          Connecting qualified practitioners with clients across the UK
        </motion.p>
      </div>

      {/* Animated Logo Track */}
      <div className="relative">
        {/* Gradient masks for smooth edge fade */}
        <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-background to-transparent z-10" />
        
        {/* Infinite scrolling track */}
        <motion.div
          className="flex gap-16 items-center"
          animate={{
            x: [0, -50 * partnerships.length + "%"]
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
          style={{
            width: `${200 * partnerships.length}%`,
          }}
        >
          {extendedLogos.map((partner, index) => (
            <motion.div
              key={`${partner.name}-${index}`}
              className="flex flex-col items-center gap-3 min-w-[200px] group"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-wellness-100 to-primary/20 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                {partner.logo}
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {partner.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
