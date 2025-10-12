import React from 'react';

export default class SimpleBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // keep minimal logging; no output change in UI
    console.error('WorkArea child error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'crimson' }}>
          Something went wrong loading this page:{' '}
          {String(this.state.error?.message || this.state.error)}
        </div>
      );
    }
    return this.props.children;
  }
}
