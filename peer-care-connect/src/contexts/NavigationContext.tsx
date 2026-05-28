import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface Breadcrumb {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface NavigationState {
  activeRoute: string;
  breadcrumbs: Breadcrumb[];
  navigationHistory: string[];
  previousRoute: string | null;
  isLoading: boolean;
}

export interface NavigationContextType {
  state: NavigationState;
  setActiveRoute: (route: string) => void;
  addBreadcrumb: (breadcrumb: Breadcrumb) => void;
  removeBreadcrumb: (href: string) => void;
  clearBreadcrumbs: () => void;
  goBack: () => void;
  setLoading: (loading: boolean) => void;
  navigateTo: (route: string, options?: { replace?: boolean; state?: any }) => void;
}

type NavigationAction =
  | { type: 'SET_ACTIVE_ROUTE'; payload: string }
  | { type: 'ADD_BREADCRUMB'; payload: Breadcrumb }
  | { type: 'REMOVE_BREADCRUMB'; payload: string }
  | { type: 'CLEAR_BREADCRUMBS' }
  | { type: 'GO_BACK' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'NAVIGATE_TO'; payload: { route: string; options?: { replace?: boolean; state?: any } } };

const initialState: NavigationState = {
  activeRoute: '/',
  breadcrumbs: [],
  navigationHistory: ['/'],
  previousRoute: null,
  isLoading: false,
};

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'SET_ACTIVE_ROUTE':
      return {
        ...state,
        activeRoute: action.payload,
        previousRoute: state.activeRoute,
        navigationHistory: [...state.navigationHistory, action.payload],
      };

    case 'ADD_BREADCRUMB':
      const existingBreadcrumb = state.breadcrumbs.find(b => b.href === action.payload.href);
      if (existingBreadcrumb) {
        return state;
      }
      return {
        ...state,
        breadcrumbs: [...state.breadcrumbs, action.payload],
      };

    case 'REMOVE_BREADCRUMB':
      return {
        ...state,
        breadcrumbs: state.breadcrumbs.filter(b => b.href !== action.payload),
      };

    case 'CLEAR_BREADCRUMBS':
      return {
        ...state,
        breadcrumbs: [],
      };

    case 'GO_BACK':
      if (state.navigationHistory.length > 1) {
        const newHistory = [...state.navigationHistory];
        newHistory.pop(); // Remove current route
        const previousRoute = newHistory[newHistory.length - 1];
        return {
          ...state,
          activeRoute: previousRoute,
          previousRoute: state.activeRoute,
          navigationHistory: newHistory,
        };
      }
      return state;

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'NAVIGATE_TO':
      return {
        ...state,
        activeRoute: action.payload.route,
        previousRoute: state.activeRoute,
        navigationHistory: [...state.navigationHistory, action.payload.route],
      };

    default:
      return state;
  }
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(navigationReducer, initialState);
  const location = useLocation();
  const navigate = useNavigate();

  // Update active route when location changes
  useEffect(() => {
    dispatch({ type: 'SET_ACTIVE_ROUTE', payload: location.pathname });
  }, [location.pathname]);

  const setActiveRoute = (route: string) => {
    dispatch({ type: 'SET_ACTIVE_ROUTE', payload: route });
  };

  const addBreadcrumb = (breadcrumb: Breadcrumb) => {
    dispatch({ type: 'ADD_BREADCRUMB', payload: breadcrumb });
  };

  const removeBreadcrumb = (href: string) => {
    dispatch({ type: 'REMOVE_BREADCRUMB', payload: href });
  };

  const clearBreadcrumbs = () => {
    dispatch({ type: 'CLEAR_BREADCRUMBS' });
  };

  const goBack = () => {
    dispatch({ type: 'GO_BACK' });
    if (state.navigationHistory.length > 1) {
      const newHistory = [...state.navigationHistory];
      newHistory.pop();
      const previousRoute = newHistory[newHistory.length - 1];
      navigate(previousRoute);
    }
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const navigateTo = (route: string, options?: { replace?: boolean; state?: any }) => {
    dispatch({ type: 'NAVIGATE_TO', payload: { route, options } });
    navigate(route, options);
  };

  const value: NavigationContextType = {
    state,
    setActiveRoute,
    addBreadcrumb,
    removeBreadcrumb,
    clearBreadcrumbs,
    goBack,
    setLoading,
    navigateTo,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Hook for breadcrumb management
export function useBreadcrumbs() {
  const { state, addBreadcrumb, removeBreadcrumb, clearBreadcrumbs } = useNavigation();
  
  return {
    breadcrumbs: state.breadcrumbs,
    addBreadcrumb,
    removeBreadcrumb,
    clearBreadcrumbs,
  };
}

// Hook for navigation history
export function useNavigationHistory() {
  const { state, goBack } = useNavigation();
  
  return {
    history: state.navigationHistory,
    canGoBack: state.navigationHistory.length > 1,
    goBack,
    previousRoute: state.previousRoute,
  };
}
