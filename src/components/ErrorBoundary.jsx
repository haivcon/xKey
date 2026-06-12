import { Component } from 'react';

/**
 * React Error Boundary — catches render crashes and shows recovery UI.
 * Wraps the entire app in main.jsx.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = async () => {
    if (window.confirm('This will DELETE all vault data permanently. Are you sure?')) {
      try {
        const { wipeAllData } = await import('../utils/storage');
        await wipeAllData();
      } catch (error) {
        console.error('Failed to wipe vault data', error);
      }
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, showDetails } = this.state;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0c10', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        padding: '24px'
      }}>
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            fontSize: '28px'
          }}>
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{this.props.t?.('common.error') || 'Something went wrong'}</h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px', lineHeight: '1.5' }}>
            {this.props.t?.('common.errorDesc') || 'xKey encountered an unexpected error. Your data is safe — try reloading the app.'}
          </p>

          <button onClick={this.handleReload} style={{
            width: '100%', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: '#0ea5e9', color: '#fff', fontWeight: '600', fontSize: '14px', marginBottom: '10px'
          }}>
              {this.props.t?.('common.reload') || 'Reload App'}
          </button>

          <button onClick={this.handleReset} style={{
            width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: '600', fontSize: '14px',
            cursor: 'pointer', marginBottom: '16px'
          }}>
              {this.props.t?.('authError.wipeReset') || 'Wipe & Reset (Last Resort)'}
          </button>

          <button onClick={() => this.setState({ showDetails: !showDetails })} style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer',
            textDecoration: 'underline'
          }}>
            {showDetails ? 'Hide Details' : 'Show Error Details'}
          </button>

          {showDetails && (
            <pre style={{
              marginTop: '12px', background: '#1e293b', padding: '12px', borderRadius: '8px',
              fontSize: '11px', color: '#f87171', textAlign: 'left', overflow: 'auto', maxHeight: '200px',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {error?.toString()}
              {'\n'}
              {error?.stack}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
