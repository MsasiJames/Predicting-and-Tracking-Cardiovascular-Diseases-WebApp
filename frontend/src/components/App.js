import React, { Component } from "react";
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';

import Dashboard from "./Dashboard";

export default class App extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </Router>
      </>
    );
  }
}

const appDiv = document.getElementById('app');
const root = ReactDOM.createRoot(appDiv);
root.render(<App />)