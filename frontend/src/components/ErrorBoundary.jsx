import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to console for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className='bg-red-50 border border-red-200 rounded-lg p-6 m-4'>
                    <div className='flex items-center mb-4'>
                        <div className='text-red-500 text-xl mr-3'>⚠️</div>
                        <h2 className='text-lg font-semibold text-red-800'>Something went wrong</h2>
                    </div>
                    <p className='text-red-600 mb-4'>
                        An error occurred while rendering this component. Please try refreshing the page.
                    </p>
                    {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                        <details className='text-sm text-red-700 bg-red-100 p-3 rounded border'>
                            <summary className='cursor-pointer font-medium mb-2'>Error Details (Development Mode)</summary>
                            <div className='whitespace-pre-wrap'>
                                <strong>Error:</strong> {this.state.error && this.state.error.toString()}
                                <br />
                                <strong>Stack Trace:</strong> {this.state.errorInfo && this.state.errorInfo.componentStack ? this.state.errorInfo.componentStack : 'No stack trace available'}
                            </div>
                        </details>
                    )}
                    <button 
                        onClick={() => window.location.reload()} 
                        className='mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition-colors duration-200'
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;