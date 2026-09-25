"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const FADE_IN_ANIMATION_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
};

// Props interface for the component
interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string;
  ctaText: string;
  images: string[];
  isLoading?: boolean;
  className?: string;
}

// Reusable Button component — Apple style
const ActionButton = ({ children, onClick }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) => (
  <motion.button
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="mt-4 px-7 py-3 rounded-full bg-[#0071e3] text-white text-[17px] font-normal tracking-[-0.01em] transition-colors hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
  >
    {children}
  </motion.button>
);

// The main hero component
export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({
  tagline,
  title,
  description,
  ctaText,
  images,
  isLoading,
  className,
}) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleOrderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      router.push('/menu');
    } else {
      router.push('/auth?redirect=/menu');
    }
  };
  const validImages = images ? images.filter(img => img && typeof img === 'string' && img.trim() !== '' && img !== '/favicon.ico') : [];
  const duplicatedImages = validImages.length > 0 ? [...validImages, ...validImages, ...validImages, ...validImages] : [];

  return (
    <section
      className={cn(
        "relative w-full h-screen overflow-hidden bg-white flex flex-col items-center justify-center text-center px-4",
        className
      )}
    >
      <div className="z-10 flex flex-col items-center mt-[-10vh]">
        {/* Tagline */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mb-4 inline-block rounded-full bg-[#f5f5f7] px-4 py-1.5 text-[12px] font-medium text-[#86868b] tracking-wide"
        >
          {tagline}
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="text-[48px] md:text-[80px] font-semibold tracking-[-0.04em] leading-[1.05] text-[#1d1d1f]"
        >
          {typeof title === 'string' ? (
            title.split(" ").map((word, i) => (
              <motion.span
                key={i}
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="inline-block"
              >
                {word}&nbsp;
              </motion.span>
            ))
          ) : (
            <motion.span variants={FADE_IN_ANIMATION_VARIANTS} className="inline-block">
              {title}
            </motion.span>
          )}
        </motion.h1>

        {/* Description */}
        <motion.p
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.5 }}
          className="mt-4 max-w-lg text-[21px] font-normal leading-relaxed text-[#86868b]"
        >
          {description}
        </motion.p>

        {/* Call to Action Button */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.6 }}
        >
          <div onClick={handleOrderClick} className="cursor-pointer">
            <ActionButton>{ctaText}</ActionButton>
          </div>
          <motion.a
            href="/menu"
            onClick={handleOrderClick}
            initial="hidden"
            animate="show"
            variants={FADE_IN_ANIMATION_VARIANTS}
            transition={{ delay: 0.7 }}
            className="block mt-3 text-[#0071e3] text-[17px] hover:underline cursor-pointer"
          >
            Lihat Menu &gt;
          </motion.a>
        </motion.div>
      </div>

      {/* Animated Image Marquee */}
      <div className="absolute bottom-0 left-0 w-full h-1/3 md:h-2/5 overflow-hidden">
        {isLoading || duplicatedImages.length === 0 ? (
          <div className="flex gap-4 px-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="aspect-[3/4] h-48 md:h-64 flex-shrink-0 bg-neutral-200 animate-pulse rounded-2xl"
                style={{
                  rotate: `${(n % 2 === 0 ? -2 : 5)}deg`,
                }}
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="flex gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: ["0%", "-50%"] }}
            transition={{
              opacity: { duration: 0.5 },
              x: { ease: "linear", duration: 20, repeat: Infinity }
            }}
          >
            {duplicatedImages.map((src, index) => (
              <div
                key={index}
                className="relative aspect-[3/4] h-48 md:h-64 flex-shrink-0"
                style={{
                  rotate: `${(index % 2 === 0 ? -2 : 5)}deg`,
                }}
              >
                <img
                  src={src}
                  alt={`Showcase image ${index + 1}`}
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};
