// components/errorBoundary/TranslationErrorBoundary.tsx
import React from 'react';

interface TranslationErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class TranslationErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  TranslationErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): TranslationErrorBoundaryState {
    const isDOMError =
      error.message.includes('insertBefore') ||
      error.message.includes('removeChild') ||
      error.message.includes('not a child');

    if (isDOMError) {
      return {
        hasError: true,
        errorMessage: 'Browser translation detected. Refreshing...',
      };
    }

    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Translation error caught:', error, errorInfo);
    setTimeout(() => window.location.reload(), 1000);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">
              {this.state.errorMessage}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TranslationErrorBoundary;
