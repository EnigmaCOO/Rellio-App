import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'xl': '20px',
        '2xl': '24px',
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        // Rellio color scheme
        'rellio-white': '#FFFFFF',
        'rellio-dark-gray': '#1F2937',
        'rellio-accent-teal': '#00D5FF',
        
        // Majestic Compass + Cosmos Theme
        'bg-deep': '#060a1a',
        'bg-indigo': '#0A0F29',
        'gold': '#D4AF37',
        'teal': '#00D5FF',
        'text-primary': '#F2F5FA',
        'text-muted': '#B8C0D6',
        'glass-card': 'rgba(255,255,255,0.04)',
        'card-border': 'rgba(212,175,55,0.18)',
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        'display': ['Inter', 'ui-sans-serif', 'system-ui'],
        'serif': ['Cormorant Garamond', 'ui-serif', 'Georgia'],
      },
      boxShadow: {
        'glow-gold': '0 0 24px rgba(212,175,55,0.35)',
        'glow-teal': '0 0 18px rgba(0,213,255,0.30)',
        'card-shadow': '0 10px 30px rgba(0,0,0,0.35)',
      },
      keyframes: {
        'spin-once': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse-glow-gold': {
          '0%, 100%': { boxShadow: '0 0 24px rgba(212,175,55,0.35)' },
          '50%': { boxShadow: '0 0 36px rgba(212,175,55,0.55)' },
        },
        'float-up': {
          '0%': { 
            opacity: '0',
            transform: 'translateY(10px)' 
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)' 
          },
        },
        'dust-drift': {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '25%': { transform: 'translateX(20px) translateY(-15px)' },
          '50%': { transform: 'translateX(-10px) translateY(-30px)' },
          '75%': { transform: 'translateX(15px) translateY(-20px)' },
          '100%': { transform: 'translateX(0) translateY(0)' },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'spin-once': 'spin-once 1.2s ease-out forwards',
        'pulse-glow-gold': 'pulse-glow-gold 2.4s ease-in-out infinite',
        'float-up': 'float-up 0.5s ease-out',
        'dust-drift': 'dust-drift 15s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
