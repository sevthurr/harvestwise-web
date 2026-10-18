import React from "react";
import { useRouteError } from "react-router";
import { useLanguage } from "../contexts/LanguageContext";

function CrashScreen({ title, message, details, homeHref = "/" }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-[var(--hw-neutral-50)]">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
          <svg
            className="w-6 h-6 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[var(--hw-neutral-900)]">
            {title}
          </h1>
          <p className="text-sm text-[var(--hw-neutral-600)]">{message}</p>
          {details ? (
            <p className="text-xs text-[var(--hw-neutral-500)] break-words">
              {details}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Reload
          </button>
          <a
            href={homeHref}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] text-sm font-medium bg-white hover:bg-[var(--hw-neutral-50)] transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export function RouteErrorElement() {
  const error = useRouteError();
  const { t } = useLanguage();

  let details = null;
  if (error) {
    if (typeof error === "string") {
      details = error;
    } else if (error.message) {
      details = error.message;
    } else if (error.statusText) {
      details = error.statusText;
    }
  }

  return (
    <CrashScreen
      title={t("common.error_title", {}, "Something went wrong")}
      message={t(
        "common.error_body",
        {},
        "An unexpected error stopped this page from loading."
      )}
      details={details}
      homeHref="/"
    />
  );
}

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("AppErrorBoundary caught", error, info);
  }

  render() {
    if (this.state.error) {
      const error = this.state.error;
      let details = null;
      if (typeof error === "string") {
        details = error;
      } else if (error && error.message) {
        details = error.message;
      }
      return (
        <CrashScreen
          title="Something went wrong"
          message="An unexpected error stopped the app from loading."
          details={details}
          homeHref="/"
        />
      );
    }
    return this.props.children;
  }
}
