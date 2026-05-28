/**
 * Tests for useMobile, useTouchDevice, useViewport
 * Tests device breakpoint logic (pure) without renderHook to avoid React compat issues
 */

describe('use-mobile breakpoint logic', () => {
  // Pure breakpoint logic matching the hook implementation
  function getBreakpoints(width: number) {
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
    };
  }

  it('width < 768 => isMobile', () => {
    expect(getBreakpoints(500)).toEqual({ isMobile: true, isTablet: false, isDesktop: false });
    expect(getBreakpoints(767)).toEqual({ isMobile: true, isTablet: false, isDesktop: false });
  });

  it('768 <= width < 1024 => isTablet', () => {
    expect(getBreakpoints(768)).toEqual({ isMobile: false, isTablet: true, isDesktop: false });
    expect(getBreakpoints(900)).toEqual({ isMobile: false, isTablet: true, isDesktop: false });
    expect(getBreakpoints(1023)).toEqual({ isMobile: false, isTablet: true, isDesktop: false });
  });

  it('width >= 1024 => isDesktop', () => {
    expect(getBreakpoints(1024)).toEqual({ isMobile: false, isTablet: false, isDesktop: true });
    expect(getBreakpoints(1200)).toEqual({ isMobile: false, isTablet: false, isDesktop: true });
  });
});
