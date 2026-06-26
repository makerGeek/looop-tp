import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 className="text-2xl font-semibold">{children}</h1>,
    h2: ({ children }) => (
      <h2 className="mt-6 text-lg font-semibold">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-4 text-base font-semibold">{children}</h3>
    ),
    p: ({ children }) => <p className="my-3">{children}</p>,
    ul: ({ children }) => <ul className="my-3 list-disc pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="my-3 list-decimal pl-5">{children}</ol>,
    li: ({ children }) => <li className="my-1">{children}</li>,
    code: ({ children }) => (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="my-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">
        {children}
      </pre>
    ),
    ...components,
  };
}
