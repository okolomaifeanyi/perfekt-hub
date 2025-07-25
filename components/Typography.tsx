import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

interface ListProps extends HTMLAttributes<HTMLUListElement> {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function H1({ children }: { children: ReactNode }) {
  return (
    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
      {children}
    </h1>
  );
}

export function H2({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <h2 className={`scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 ${className}`}>
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
      {children}
    </h3>
  );
}

export function H4({ children }: { children: ReactNode }) {
  return (
    <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
      {children}
    </h4>
  );
}

interface PProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const P = forwardRef<
  HTMLParagraphElement,
  PProps & { compact?: boolean }
>(({ children, className = "", compact = false, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={`leading-7 ${
        compact ? "mt-0" : "[&:not(:first-child)]:mt-6"
      } ${className}`}
      {...props}
    >
      {children}
    </p>
  );
});

P.displayName = "P";


export function Blockquote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="mt-6 border-l-2 pl-6 italic">{children}</blockquote>
  );
}

export const List = forwardRef<HTMLUListElement, ListProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <ul
        ref={ref}
        className={`${className} my-6 ml-6 list-disc [&>li]:mt-2`}
        {...props}
      >
        {children}
      </ul>
    );
  }
);

List.displayName = "List";

export function Lead({ children }: { children: ReactNode }) {
  return <p className="text-xl text-muted-foreground">{children}</p>;
}

export function Large({ children }: { children: ReactNode }) {
  return <div className="text-lg font-semibold">{children}</div>;
}

export function Small({ children }: { children: ReactNode }) {
  return <small className="text-sm font-medium leading-none">{children}</small>;
}

export function Muted({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`${className} text-sm text-muted-foreground`}>{children}</p>
  );
}
