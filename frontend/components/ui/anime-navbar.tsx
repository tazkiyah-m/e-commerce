"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
  defaultActive?: string
}

export function AnimeNavBar({ items, className, defaultActive = "Home" }: NavBarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>(defaultActive)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Sync active tab with pathname
  useEffect(() => {
    const match = items.find(item => item.url === pathname)
    if (match) setActiveTab(match.name)
  }, [pathname, items])

  if (!mounted) return null

  return (
    <div className="fixed top-5 left-0 right-0 z-[9999]">
      <div className="flex justify-center pt-6">
        <motion.div 
          className="flex items-center gap-3 bg-black/50 border border-white/10 backdrop-blur-lg py-2 px-2 rounded-full shadow-lg relative"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.name
            const isHovered = hoveredTab === item.name

            return (
              <Link
                key={item.name}
                href={item.url}
                onClick={() => {
                  setActiveTab(item.name)
                }}
                onMouseEnter={() => setHoveredTab(item.name)}
                onMouseLeave={() => setHoveredTab(null)}
                className={cn(
                  "relative cursor-pointer text-sm font-semibold px-6 py-3 rounded-full transition-all duration-300",
                  "text-white/70 hover:text-white",
                  isActive && "text-white"
                )}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full -z-10 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0.3, 0.5, 0.3],
                      scale: [1, 1.03, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="absolute inset-0 bg-[#0071e3]/25 rounded-full blur-md" />
                    <div className="absolute inset-[-4px] bg-[#0071e3]/20 rounded-full blur-xl" />
                    <div className="absolute inset-[-8px] bg-[#0071e3]/15 rounded-full blur-2xl" />
                    <div className="absolute inset-[-12px] bg-[#0071e3]/5 rounded-full blur-3xl" />
                    
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-[#0071e3]/0 via-[#0071e3]/20 to-[#0071e3]/0"
                      style={{
                        animation: "shine 3s ease-in-out infinite"
                      }}
                    />
                  </motion.div>
                )}

                <motion.span
                  className="hidden md:inline relative z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {item.name}
                </motion.span>
                <motion.span 
                  className="md:hidden relative z-10"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon size={18} strokeWidth={2.5} />
                </motion.span>
          
                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 bg-white/10 rounded-full -z-10"
                    />
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div
                    layoutId="anime-mascot"
                    className="absolute -top-14 left-1/2 -translate-x-1/2 pointer-events-none"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 28,
                    }}
                  >
                    {/* Ayam Bakar Mascot Container */}
                    <div className="relative flex flex-col items-center">
                      {/* Rising Smoke / Fire Sparkles */}
                      <motion.div 
                        className="absolute -top-4 flex gap-1 z-20 text-[11px]"
                        animate={{
                          y: [-2, -6, -2],
                          opacity: [0.7, 1, 0.7],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <span>🔥</span>
                        {hoveredTab && <span>✨</span>}
                      </motion.div>

                      {/* Drumstick Meat Body */}
                      <motion.div 
                        className="relative w-11 h-11 bg-gradient-to-b from-[#d97706] via-[#b45309] to-[#78350f] rounded-[20px] shadow-[0_4px_12px_rgba(180,83,9,0.4)] border border-[#f59e0b]/40 flex flex-col items-center justify-center overflow-hidden"
                        animate={
                          hoveredTab ? {
                            scale: [1, 1.15, 1],
                            rotate: [0, -8, 8, 0],
                            transition: { duration: 0.4, ease: "easeInOut" }
                          } : {
                            y: [0, -4, 0],
                            transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                          }
                        }
                      >
                        {/* Grill Marks */}
                        <div className="absolute top-2 left-1.5 w-6 h-0.5 bg-[#381a07]/80 rounded-full -rotate-12" />
                        <div className="absolute top-4 right-1.5 w-5 h-0.5 bg-[#381a07]/80 rounded-full rotate-12" />
                        <div className="absolute bottom-2 left-2 w-5 h-0.5 bg-[#381a07]/70 rounded-full -rotate-6" />

                        {/* Cute Face: Eyes */}
                        <div className="flex gap-2.5 z-10 mt-1">
                          <motion.div 
                            className="w-2 h-2 bg-[#1c1917] rounded-full"
                            animate={hoveredTab ? { scaleY: [1, 0.2, 1] } : {}}
                            transition={{ duration: 0.2 }}
                          />
                          <motion.div 
                            className="w-2 h-2 bg-[#1c1917] rounded-full"
                            animate={hoveredTab ? { scaleY: [1, 0.2, 1] } : {}}
                            transition={{ duration: 0.2 }}
                          />
                        </div>

                        {/* Blush Cheeks */}
                        <div className="flex justify-between w-7 z-10 -mt-0.5">
                          <div className="w-1.5 h-1 bg-[#fbbf24] rounded-full opacity-80" />
                          <div className="w-1.5 h-1 bg-[#fbbf24] rounded-full opacity-80" />
                        </div>

                        {/* Happy Mouth */}
                        <motion.div 
                          className="w-3 h-1.5 border-b-2 border-[#1c1917] rounded-full z-10"
                          animate={hoveredTab ? { scale: 1.2 } : { scale: 1 }}
                        />
                      </motion.div>

                      {/* Drumstick Bone Base */}
                      <motion.div 
                        className="w-3 h-3 bg-[#fef3c7] border border-[#f59e0b] rounded-b-md shadow-sm -mt-0.5 flex flex-col items-center justify-end pb-0.5"
                        animate={hoveredTab ? { y: [-1, -3, -1] } : { y: [0, -2, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <div className="w-1.5 h-1.5 bg-[#fde68a] rounded-full" />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </Link>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
