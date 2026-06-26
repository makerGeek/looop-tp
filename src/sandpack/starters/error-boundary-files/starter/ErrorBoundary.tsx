// TODO: class component with state { error: Error | null }.
// Implement static getDerivedStateFromError + componentDidCatch + reset().
// Props: { children, fallback: ({ error, reset }) => ReactNode }.

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: (args: { error: Error; reset: () => void }) => ReactNode;
}

export class ErrorBoundary extends Component<Props> {
  render() {
    return this.props.children;
  }
}
