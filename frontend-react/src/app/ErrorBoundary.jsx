import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(error){ return { hasError:true, error }; }
  componentDidCatch(error, info){ console.error("UI Error:", error, info); }
  render(){
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-700">
          <h2 className="font-bold">Co loi xay ra o frontend</h2>
          <pre className="text-xs whitespace-pre-wrap">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
