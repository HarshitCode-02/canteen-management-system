import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  retry = () => {
    this.setState((state) => ({ hasError: false, resetKey: state.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary" role="alert">
          <h1>Something went wrong</h1>
          <p>We couldn't display this page. Please try again.</p>
          <button type="button" onClick={this.retry}>Try again</button>
        </main>
      );
    }

    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
