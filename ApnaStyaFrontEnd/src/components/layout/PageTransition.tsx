import { type ReactNode } from "react";

const PageTransition = ({ children }: { children: ReactNode }) => {
  return (
    <div className="animate-page-enter">
      {children}
    </div>
  );
};

export default PageTransition;
