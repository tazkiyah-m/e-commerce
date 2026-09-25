'use client'

import { useRef } from "react"
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown } from "lucide-react"

export interface ParallaxSection {
    id: number | string;
    title: string;
    description: string;
    imageUrl?: string;
    statNumber?: string;
    statLabel?: string;
    reverse?: boolean;
}

interface ParallaxScrollFeatureProps {
    sections: ParallaxSection[];
    introTitle?: string;
    introSubtitle?: string;
}

// Sub-component to safely call hooks per item
const ParallaxSectionItem = ({ section, isReverse }: { section: ParallaxSection, isReverse: boolean }) => {
    const sectionRef = useRef<HTMLDivElement>(null);
    
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "center start"]
    });

    const opacity = useTransform(scrollYProgress, [0, 0.7], [0, 1]);
    const clipPath = useTransform(scrollYProgress, [0, 0.7], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
    const y = useTransform(scrollYProgress, [0, 1], [-50, 0]);

    return (
        <div 
            ref={sectionRef} 
            className={`min-h-[80vh] flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 py-16 ${isReverse ? 'md:flex-row-reverse' : ''}`}
        >
            <motion.div style={{ y }} className="flex-1">
                <h3 className="text-[40px] md:text-[56px] font-semibold tracking-[-0.03em] leading-[1.07] text-[#1d1d1f] mb-4">{section.title}</h3>
                <motion.p 
                    style={{ y }} 
                    className="text-[#86868b] text-[17px] leading-relaxed max-w-md"
                >
                    {section.description}
                </motion.p>
            </motion.div>
            <motion.div 
                style={{ 
                    opacity,
                    clipPath,
                }}
                className="relative flex-1 flex justify-center w-full"
            >
                <div className="relative w-full max-w-md aspect-square md:aspect-[3/4] rounded-3xl overflow-hidden flex items-center justify-center bg-[#f5f5f7]">
                    {section.statNumber ? (
                        <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-[#f5f5f7]">
                            <h4 className="text-[64px] lg:text-[96px] font-bold tracking-tighter leading-none text-[#1d1d1f] mb-4">
                                {section.statNumber}
                            </h4>
                            {section.statLabel && (
                                <p className="text-[17px] font-semibold text-[#86868b] tracking-widest uppercase">
                                    {section.statLabel}
                                </p>
                            )}
                        </div>
                    ) : section.imageUrl ? (
                        <img 
                            src={section.imageUrl} 
                            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                            alt={section.title}
                        />
                    ) : null}
                </div>
            </motion.div>
        </div>
    );
};

export const ParallaxScrollFeature = ({ 
    sections, 
    label = "Our Story",
    introTitle = "Kisah Cita Rasa Kami",
    introSubtitle = "SCROLL"
}: ParallaxScrollFeatureProps & { label?: string }) => {
  return (
    <div className="bg-white text-[#1d1d1f] overflow-hidden">
      <div className='min-h-[50vh] w-full flex flex-col items-center justify-center py-24'>
        <p className="text-[#86868b] text-[12px] font-medium tracking-widest uppercase mb-4">{label}</p>
        <h2 className='text-[48px] md:text-[64px] font-semibold tracking-[-0.04em] leading-[1.07] max-w-2xl text-center text-[#1d1d1f] px-4'>{introTitle}</h2>
        <p className='mt-8 flex items-center gap-2 text-[12px] text-[#86868b] font-medium tracking-[0.2em] uppercase animate-pulse'>
            {introSubtitle} <ArrowDown size={14} />
        </p>
      </div>
       <div className="flex flex-col md:px-0 px-6 max-w-[1024px] mx-auto">
            {sections.map((section, index) => {
                const isReverse = section.reverse ?? (index % 2 !== 0);
                return (
                    <ParallaxSectionItem 
                        key={section.id} 
                        section={section} 
                        isReverse={isReverse} 
                    />
                );
            })}
        </div>
    </div>
  );
};
