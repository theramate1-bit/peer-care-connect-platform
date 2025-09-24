import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				sm: '1.5rem',
				lg: '2rem',
				xl: '2.5rem',
				'2xl': '3rem'
			},
			screens: {
				sm: '640px',
				md: '768px',
				lg: '1024px',
				xl: '1280px',
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'inter': ['Inter', 'sans-serif'],
				'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
			},
			fontSize: {
				'xs': ['0.75rem', { lineHeight: '1rem' }],
				'sm': ['0.875rem', { lineHeight: '1.25rem' }],
				'base': ['1rem', { lineHeight: '1.5rem' }],
				'lg': ['1.125rem', { lineHeight: '1.75rem' }],
				'xl': ['1.25rem', { lineHeight: '1.75rem' }],
				'2xl': ['1.5rem', { lineHeight: '2rem' }],
				'3xl': ['1.875rem', { lineHeight: '2.25rem' }],
				'4xl': ['2.25rem', { lineHeight: '2.5rem' }],
				'5xl': ['3rem', { lineHeight: '1' }],
				'6xl': ['3.75rem', { lineHeight: '1' }],
				// Mobile-optimized typography
				'mobile-xs': ['0.625rem', { lineHeight: '0.875rem' }],
				'mobile-sm': ['0.75rem', { lineHeight: '1rem' }],
				'mobile-base': ['0.875rem', { lineHeight: '1.25rem' }],
				'mobile-lg': ['1rem', { lineHeight: '1.5rem' }],
				'mobile-xl': ['1.125rem', { lineHeight: '1.75rem' }],
				'mobile-2xl': ['1.25rem', { lineHeight: '1.75rem' }],
				'mobile-3xl': ['1.5rem', { lineHeight: '2rem' }],
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'128': '32rem',
				// Mobile-optimized spacing
				'mobile-xs': '0.25rem',
				'mobile-sm': '0.5rem',
				'mobile-md': '0.75rem',
				'mobile-lg': '1rem',
				'mobile-xl': '1.5rem',
				'mobile-2xl': '2rem',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					light: 'hsl(var(--primary-light))',
					dark: 'hsl(var(--primary-dark))',
					50: 'hsl(var(--primary) / 0.05)',
					100: 'hsl(var(--primary) / 0.1)',
					200: 'hsl(var(--primary) / 0.2)',
					300: 'hsl(var(--primary) / 0.3)',
					400: 'hsl(var(--primary) / 0.4)',
					500: 'hsl(var(--primary))',
					600: 'hsl(var(--primary-dark))',
					700: 'hsl(var(--primary-dark))',
					800: 'hsl(var(--primary-dark))',
					900: 'hsl(var(--primary-dark))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					light: 'hsl(var(--accent-light))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Healthcare-specific colors
				wellness: {
					50: '#f0fdf4',
					100: '#dcfce7',
					200: '#bbf7d0',
					300: '#86efac',
					400: '#4ade80',
					500: '#22c55e',
					600: '#16a34a',
					700: '#15803d',
					800: '#166534',
					900: '#14532d',
				},
				// Status colors
				success: {
					50: '#f0fdf4',
					100: '#dcfce7',
					500: '#22c55e',
					600: '#16a34a',
					700: '#15803d',
				},
				warning: {
					50: '#fffbeb',
					100: '#fef3c7',
					500: '#f59e0b',
					600: '#d97706',
					700: '#b45309',
				},
				error: {
					50: '#fef2f2',
					100: '#fee2e2',
					500: '#ef4444',
					600: '#dc2626',
					700: '#b91c1c',
				},
				info: {
					50: '#eff6ff',
					100: '#dbeafe',
					500: '#3b82f6',
					600: '#2563eb',
					700: '#1d4ed8',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'2xl': 'calc(var(--radius) + 4px)',
				'3xl': 'calc(var(--radius) + 8px)',
			},
			boxShadow: {
				'wellness': '0 4px 6px -1px rgba(34, 197, 94, 0.1), 0 2px 4px -1px rgba(34, 197, 94, 0.06)',
				'wellness-medium': '0 10px 15px -3px rgba(34, 197, 94, 0.1), 0 4px 6px -2px rgba(34, 197, 94, 0.05)',
				'wellness-large': '0 20px 25px -5px rgba(34, 197, 94, 0.1), 0 10px 10px -5px rgba(34, 197, 94, 0.04)',
			},
			transitionProperty: {
				'wellness': 'all',
			},
			transitionDuration: {
				'wellness': '300ms',
			},
			transitionTimingFunction: {
				'wellness': 'cubic-bezier(0.4, 0, 0.2, 1)',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-in': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'glow': {
					'0%, 100%': { boxShadow: '0 0 5px hsl(var(--primary))' },
					'50%': { boxShadow: '0 0 20px hsl(var(--primary)), 0 0 30px hsl(var(--primary))' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
				'slide-in': 'slide-in 0.3s ease-out',
				'glow': 'glow 2s ease-in-out infinite',
			},
			// Mobile-optimized button sizes
			height: {
				'mobile-button': '2rem',
				'mobile-button-lg': '2.5rem',
			},
			minHeight: {
				'mobile-button': '2rem',
				'mobile-button-lg': '2.5rem',
			},
			// Responsive utilities
			screens: {
				'xs': '475px',
				'sm': '640px',
				'md': '768px',
				'lg': '1024px',
				'xl': '1280px',
				'2xl': '1400px',
				// Custom breakpoints for healthcare content
				'healthcare-sm': '600px',
				'healthcare-md': '900px',
				'healthcare-lg': '1200px',
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		// Custom utilities
		function({ addUtilities }) {
			const newUtilities = {
				'.wellness-gradient': {
					background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
				},
				'.glow-primary': {
					boxShadow: '0 0 20px hsl(var(--primary) / 0.3)',
				},
				'.transition-wellness': {
					transitionProperty: 'all',
					transitionDuration: '300ms',
					transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
				},
				'.shadow-wellness': {
					boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.1), 0 2px 4px -1px rgba(34, 197, 94, 0.06)',
				},
				'.shadow-wellness-medium': {
					boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.1), 0 4px 6px -2px rgba(34, 197, 94, 0.05)',
				},
				'.shadow-wellness-large': {
					boxShadow: '0 20px 25px -5px rgba(34, 197, 94, 0.1), 0 10px 10px -5px rgba(34, 197, 94, 0.04)',
				},
				// Mobile-optimized utilities
				'.mobile-text-responsive': {
					fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
					lineHeight: '1.5',
				},
				'.mobile-heading-responsive': {
					fontSize: 'clamp(1.25rem, 4vw, 2rem)',
					lineHeight: '1.2',
				},
				'.mobile-button-responsive': {
					minHeight: '2.5rem',
					padding: '0.5rem 1rem',
					fontSize: '0.875rem',
				},
				'.mobile-spacing-responsive': {
					padding: 'clamp(0.5rem, 3vw, 1rem)',
					margin: 'clamp(0.25rem, 2vw, 0.5rem)',
				},
			}
			addUtilities(newUtilities)
		}
	],
} satisfies Config;
