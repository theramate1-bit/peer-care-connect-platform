import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Marathon Runner",
    image: "👩‍💼",
    rating: 5,
    text: "Found an amazing sports therapist through TheraMate. The booking process was seamless, and the treatment helped me recover from my injury faster than expected.",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Office Worker",
    image: "👨‍💻",
    rating: 5,
    text: "Struggling with back pain from desk work, I found a local osteopath who completely transformed my posture and pain levels. Highly recommend!",
  },
  {
    id: 3,
    name: "Emma Williams",
    role: "Yoga Instructor",
    image: "👩‍🏫",
    rating: 5,
    text: "As a professional practitioner myself, I appreciate the quality of therapists on TheraMate. Found excellent massage therapy for my own recovery needs.",
  },
  {
    id: 4,
    name: "David Thompson",
    role: "Construction Worker",
    image: "👷‍♂️",
    rating: 5,
    text: "After a workplace injury, TheraMate connected me with a sports therapist who specialized in occupational injuries. Couldn't be happier with the results.",
  },
  {
    id: 5,
    name: "Lisa Rodriguez",
    role: "New Mother",
    image: "👩‍👶",
    rating: 5,
    text: "Postpartum recovery was challenging, but finding a massage therapist through TheraMate who understood my needs made all the difference.",
  },
  {
    id: 6,
    name: "James Mitchell",
    role: "Athlete",
    image: "🏃‍♂️",
    rating: 5,
    text: "Regular sessions with my TheraMate sports therapist have become essential for my training. The platform makes booking and managing appointments so easy.",
  },
];

export const TestimonialsSection = () => {
  // Double the testimonials for seamless loop
  const extendedTestimonials = [...testimonials, ...testimonials];

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 mb-12">
        <motion.div
          className="text-center max-w-3xl mx-auto"
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
            What Our Users Say
          </motion.h2>
          <motion.p 
            className="text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            Real stories from real people who found healing through our platform
          </motion.p>
        </motion.div>
      </div>

      {/* Infinite scrolling testimonials */}
      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-background to-transparent z-10" />
        
        <motion.div
          className="flex gap-8 items-start py-4"
          animate={{
            x: [0, -420 * testimonials.length]
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop", 
              duration: 40,
              ease: "linear",
            },
          }}
          style={{
            width: `${420 * extendedTestimonials.length}px`,
          }}
        >
          {extendedTestimonials.map((testimonial, index) => (
            <motion.div
              key={`testimonial-${testimonial.id}-${index}`}
              className="min-w-[400px] group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative p-8 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 border border-border/50 backdrop-blur-sm shadow-xl group-hover:shadow-2xl transition-all duration-300">
                {/* Quote icon */}
                <motion.div 
                  className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-br from-wellness-500 to-primary rounded-full flex items-center justify-center shadow-lg"
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <Quote className="w-4 h-4 text-white" />
                </motion.div>

                {/* Rating */}
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                    >
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    </motion.div>
                  ))}
                </div>

                {/* Testimonial text */}
                <blockquote className="text-foreground/90 leading-relaxed mb-6 text-base font-medium">
                  "{testimonial.text}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-wellness-400/20 to-primary/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    {testimonial.image}
                  </motion.div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>

                {/* Hover gradient overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-wellness-500/5 to-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        className="text-center mt-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        viewport={{ once: true }}
      >
        <motion.p 
          className="text-lg text-muted-foreground mb-6"
          whileHover={{ scale: 1.02 }}
        >
          Join thousands of satisfied users today
        </motion.p>
      </motion.div>
    </section>
  );
};
