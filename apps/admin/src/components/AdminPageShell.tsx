import React from "react";

type AdminPageShellProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function AdminPageShell({
  title,
  description,
  actions,
  children,
  className,
}: AdminPageShellProps) {
  return (
    <div className={["min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6", className ?? ""].join(" ")}>
      <div className="mx-auto max-w-full">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {description ? <p className="mt-2 text-sm text-gray-600">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>

        {children}
      </div>
    </div>
  );
}
