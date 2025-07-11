import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './components/register';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import VerifyEmail from './components/VerifyEmail';
import AddCandidate from './components/AddCandidate';
import VotingPage from './components/VotingPage';
import PrivateRoute from './components/PrivateRoute'; // 🔐 NEW
import AdminPage from './components/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/adminpage" element={<AdminPage />} />

        {/* 🔐 Protected Routes */}
        <Route
          path="/addcandidate"
          element={
            <PrivateRoute>
              <AddCandidate />
            </PrivateRoute>
          }
        />
        <Route
          path="/votingpage"
          element={
            <PrivateRoute>
              <VotingPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
