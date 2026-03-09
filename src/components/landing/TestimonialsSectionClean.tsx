import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Marathon Runner",
    rating: 5,
    text: "Found an amazing sports therapist through Theramate. The booking was seamless, and the treatment helped me recover faster than expected.",
    initials: "SJ",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Office Worker",
    rating: 5,
    text: "Struggling with back pain from desk work, I found a local osteopath who completely transformed my posture. Highly recommend!",
    initials: "MC",
  },
  {
    id: 3,
    name: "Emma Williams",
    role: "Yoga Instructor",
    rating: 5,
    text: "As a professional practitioner myself, I appreciate the quality of therapists here. Found excellent massage therapy for my own recovery.",
    initials: "EW",
  },
];

export const TestimonialsSectionClean = () => {
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
      className="py-28 px-6 bg-white dark:bg-slate-950"
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
              Testimonials
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              Loved by hundreds.
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Real stories from real people finding relief through our platform.
            </p>
          </motion.div>

          {/* Testimonials grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <motion.div
                key={testimonial.id}
                variants={itemVariants}
                className="group"
              >
                <div className="relative h-full p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-[border-color,background-color] duration-200 ease-out">
                  {/* Quote */}
                  <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Quote className="w-5 h-5 text-primary" />
                  </div>

                  {/* Stars */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8 text-base">
                    "{testimonial.text}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-wellness-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{testimonial.initials}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
