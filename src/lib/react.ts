/**
 * Single re-export of React so the whole app uses one module instance.
 * Fixes "Cannot read properties of null (reading 'useState')" when Vite pre-bundling
 * creates multiple React chunks (e.g. AuthContext vs react-router-dom).
 * Named exports avoid ESM interop issues with "export * from 'react'".
 */
export { default } from 'react';
export {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  useReducer,
  useImperativeHandle,
  useLayoutEffect,
  useDebugValue,
  createElement,
  Fragment,
  StrictMode,
  Component,
  PureComponent,
  memo,
  forwardRef,
  lazy,
  Suspense,
  cloneElement,
  isValidElement,
  Children,
  createRef,
} from 'react';
export type {
  ReactNode,
  FC,
  ReactElement,
  ComponentType,
  ComponentProps,
  ComponentPropsWithoutRef,
} from 'react';
