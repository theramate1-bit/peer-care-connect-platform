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
			},
			// Optimal reading widths for better UX
			maxWidth: {
				'prose': '65ch',      // Optimal reading width
				'prose-wide': '75ch',  // Wide reading width
				'content': '1200px',  // Content max width
				'wide': '1400px',     // Wide content max width
			}
		},
		extend: {
			fontFamily: {
				'inter': ['Inter Variable', 'Inter', 'sans-serif'],
				'sans': ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
			},
			fontSize: {
				// Typography scale: Display (4xl-6xl), Heading (xl-3xl), Body (base-lg), Small (xs-sm). See docs/design-system/typography.md and src/lib/typography-tokens.ts
				// Refined type scale with 1.2 ratio for headings, 1.5 for body
				'xs': ['clamp(0.75rem, 0.5vw + 0.125rem, 0.8125rem)', { lineHeight: '1.5', letterSpacing: '0.01em' }],
				'sm': ['clamp(0.875rem, 0.75vw + 0.125rem, 0.9375rem)', { lineHeight: '1.5', letterSpacing: '0.005em' }],
				'base': ['clamp(0.9375rem, 1vw + 0.125rem, 1rem)', { lineHeight: '1.6', letterSpacing: '-0.008em' }],
				'lg': ['clamp(1.0625rem, 1.25vw + 0.125rem, 1.125rem)', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
				'xl': ['clamp(1.1875rem, 1.5vw + 0.125rem, 1.25rem)', { lineHeight: '1.5', letterSpacing: '-0.012em' }],
				'2xl': ['clamp(1.5rem, 2vw + 0.5rem, 1.875rem)', { lineHeight: '1.3', letterSpacing: '-0.015em' }],
				'3xl': ['clamp(1.875rem, 3vw + 0.5rem, 2.25rem)', { lineHeight: '1.25', letterSpacing: '-0.017em' }],
				'4xl': ['clamp(2.25rem, 4vw + 0.5rem, 3rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
				'5xl': ['clamp(3rem, 5vw + 0.5rem, 3.75rem)', { lineHeight: '1.15', letterSpacing: '-0.022em' }],
				'6xl': ['clamp(3.75rem, 6vw + 0.5rem, 4.5rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
				// Mobile-optimized typography with improved line-heights
				'mobile-xs': ['clamp(0.625rem, 0.5vw + 0.125rem, 0.75rem)', { lineHeight: '1.5', letterSpacing: '0.01em' }],
				'mobile-sm': ['clamp(0.75rem, 0.75vw + 0.125rem, 0.875rem)', { lineHeight: '1.5', letterSpacing: '0.005em' }],
				'mobile-base': ['clamp(0.875rem, 1vw + 0.125rem, 0.9375rem)', { lineHeight: '1.6', letterSpacing: '-0.008em' }],
				'mobile-lg': ['clamp(1rem, 1.25vw + 0.125rem, 1.0625rem)', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
				'mobile-xl': ['clamp(1.125rem, 1.5vw + 0.125rem, 1.1875rem)', { lineHeight: '1.5', letterSpacing: '-0.012em' }],
				'mobile-2xl': ['clamp(1.25rem, 2vw + 0.25rem, 1.5rem)', { lineHeight: '1.3', letterSpacing: '-0.015em' }],
				'mobile-3xl': ['clamp(1.5rem, 3vw + 0.25rem, 1.875rem)', { lineHeight: '1.25', letterSpacing: '-0.017em' }],
			},
			spacing: {
				// Consistent 4px base unit spacing scale
				'0.5': '0.125rem',    // 2px
				'1': '0.25rem',       // 4px
				'1.5': '0.375rem',    // 6px
				'2': '0.5rem',        // 8px
				'2.5': '0.625rem',    // 10px
				'3': '0.75rem',       // 12px
				'3.5': '0.875rem',    // 14px
				'4': '1rem',          // 16px
				'5': '1.25rem',       // 20px
				'6': '1.5rem',        // 24px
				'7': '1.75rem',       // 28px
				'8': '2rem',          // 32px
				'9': '2.25rem',       // 36px
				'10': '2.5rem',       // 40px
				'11': '2.75rem',      // 44px
				'12': '3rem',         // 48px
				'14': '3.5rem',       // 56px
				'16': '4rem',         // 64px
				'18': '4.5rem',       // 72px
				'20': '5rem',         // 80px
				'24': '6rem',         // 96px
				'28': '7rem',         // 112px
				'32': '8rem',         // 128px
				'88': '22rem',
				'128': '32rem',
				// Mobile-optimized spacing with better touch targets
				'mobile-xs': '0.25rem',
				'mobile-sm': '0.5rem',
				'mobile-md': '0.75rem',
				'mobile-lg': '1rem',
				'mobile-xl': '1.5rem',
				'mobile-2xl': '2rem',
				// Section spacing for better visual hierarchy
				'section-xs': '2rem',      // 32px
				'section-sm': '3rem',      // 48px
				'section-md': '4rem',      // 64px
				'section-lg': '6rem',      // 96px
				'section-xl': '8rem',      // 128px
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
					50: 'hsl(var(--primary-50))',
					100: 'hsl(var(--primary-100))',
					200: 'hsl(var(--primary-200))',
					300: 'hsl(var(--primary-300))',
					400: 'hsl(var(--primary-400))',
					500: 'hsl(var(--primary-500))',
					600: 'hsl(var(--primary-600))',
					700: 'hsl(var(--primary-700))',
					800: 'hsl(var(--primary-800))',
					900: 'hsl(var(--primary-900))',
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
					light: 'hsl(var(--accent-light))',
					dark: 'hsl(var(--accent-dark))',
					50: 'hsl(var(--accent-50))',
					100: 'hsl(var(--accent-100))',
					200: 'hsl(var(--accent-200))',
					300: 'hsl(var(--accent-300))',
					400: 'hsl(var(--accent-400))',
					500: 'hsl(var(--accent))',
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
				// Semantic color tokens - WCAG AA compliant
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))',
					50: 'hsl(var(--success-50))',
					100: 'hsl(var(--success-100))',
					500: 'hsl(var(--success-500))',
					600: 'hsl(var(--success-600))',
					700: 'hsl(var(--success-700))',
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))',
					50: 'hsl(var(--warning-50))',
					100: 'hsl(var(--warning-100))',
					500: 'hsl(var(--warning-500))',
					600: 'hsl(var(--warning-600))',
					700: 'hsl(var(--warning-700))',
				},
				error: {
					DEFAULT: 'hsl(var(--error))',
					foreground: 'hsl(var(--error-foreground))',
					50: 'hsl(var(--error-50))',
					100: 'hsl(var(--error-100))',
					500: 'hsl(var(--error-500))',
					600: 'hsl(var(--error-600))',
					700: 'hsl(var(--error-700))',
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))',
					50: 'hsl(var(--info-50))',
					100: 'hsl(var(--info-100))',
					500: 'hsl(var(--info-500))',
					600: 'hsl(var(--info-600))',
					700: 'hsl(var(--info-700))',
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
				// Enhanced 3-layer shadow system (inspired by onghost.com)
				'depth-1': '0 0.6px 1.6px -1px rgba(0, 0, 0, 0.15), 0 2.3px 6px -2px rgba(0, 0, 0, 0.14), 0 10px 26px -3px rgba(0, 0, 0, 0.1)',
				'depth-2': '0 1.2px 3.2px -1px rgba(0, 0, 0, 0.18), 0 4.6px 12px -2px rgba(0, 0, 0, 0.16), 0 20px 52px -3px rgba(0, 0, 0, 0.12)',
				'depth-3': '0 1.8px 4.8px -1px rgba(0, 0, 0, 0.2), 0 6.9px 18px -2px rgba(0, 0, 0, 0.18), 0 30px 78px -3px rgba(0, 0, 0, 0.14)',
			},
			aspectRatio: {
				'auto': 'auto',
				'square': '1 / 1',
				'video': '16 / 9',
				'video-vertical': '9 / 16',
				'photo': '4 / 3',
				'photo-wide': '3 / 2',
				'card': '1.6 / 1',
				'banner': '21 / 9',
			},
			willChange: {
				'auto': 'auto',
				'scroll': 'scroll-position',
				'contents': 'contents',
				'transform': 'transform',
				'opacity': 'opacity',
				'filter': 'filter',
			},
			// Place-content utilities for modern flexbox
			placeContent: {
				'center': 'center',
				'start': 'start',
				'end': 'end',
				'between': 'space-between',
				'around': 'space-around',
				'evenly': 'space-evenly',
				'stretch': 'stretch',
				'center-start': 'center start',
				'center-end': 'center end',
				'start-center': 'start center',
				'end-center': 'end center',
			},
			// Flex-flow utilities
			flexFlow: {
				'row': 'row',
				'row-wrap': 'row wrap',
				'row-nowrap': 'row nowrap',
				'row-wrap-reverse': 'row wrap-reverse',
				'column': 'column',
				'column-wrap': 'column wrap',
				'column-nowrap': 'column nowrap',
				'column-wrap-reverse': 'column wrap-reverse',
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
				// Modern CSS feature utilities
				'.shadow-depth-1': {
					boxShadow: 'var(--shadow-depth-1)',
				},
				'.shadow-depth-2': {
					boxShadow: 'var(--shadow-depth-2)',
				},
				'.shadow-depth-3': {
					boxShadow: 'var(--shadow-depth-3)',
				},
				// Will-change optimization utilities
				'.will-change-transform': {
					willChange: 'var(--will-change-transform, transform)',
				},
				'.will-change-opacity': {
					willChange: 'var(--will-change-opacity, opacity)',
				},
				'.will-change-filter': {
					willChange: 'var(--will-change-filter, filter)',
				},
				// Mask utilities for gradient overlays
				'.mask-fade': {
					mask: 'var(--mask-gradient-fade)',
					WebkitMask: 'var(--mask-gradient-fade)',
				},
				'.mask-fade-top': {
					mask: 'var(--mask-gradient-fade-top)',
					WebkitMask: 'var(--mask-gradient-fade-top)',
				},
				'.mask-fade-sides': {
					mask: 'var(--mask-gradient-fade-sides)',
					WebkitMask: 'var(--mask-gradient-fade-sides)',
				},
				// Min-content and max-content sizing
				'.h-min-content': {
					height: 'min-content',
				},
				'.h-max-content': {
					height: 'max-content',
				},
				'.w-min-content': {
					width: 'min-content',
				},
				'.w-max-content': {
					width: 'max-content',
				},
			}
			addUtilities(newUtilities)
		}
	],
} satisfies Config;
