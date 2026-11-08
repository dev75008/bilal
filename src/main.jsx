import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './style.css';

class ErrorBoundary extends React.Component {
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  render(){return this.state.error?<main className="fatal-error"><h1>Le plan n’a pas pu s’afficher</h1><p>Vos sauvegardes locales sont conservées. Rechargez la page pour réessayer.</p><button onClick={()=>location.reload()}>Recharger</button></main>:this.props.children;}
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
