import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from "axios";
import Cookies from "js-cookie";

axios.defaults.baseURL = 'http://localhost:8000' // Set the base URL for all requests

const token = Cookies.get('token');

if(token){
  axios.defaults.headers.common = { 'Authorization': `Bearer ${token}` }
}


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
