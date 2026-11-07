import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

export const PRESET_ACCOUNTS: User[] = [
  {
    id: 1,
    email: 'warden@msec.ac.in',
    full_name: 'Dr. Suresh Kumar N.',
    designation: 'Chief Warden',
    role: 'warden',
    department: 'Hostel Administration & Mech Engg',
    phone: '+91 94432 18901',
    address: 'Staff Quarters B-04, MSEC Residential Campus, Bangalore - 562157',
    emergency_contact: '+91 94432 18900',
    blood_group: 'O+',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    email: 'priya.warden@msec.ac.in',
    full_name: 'Prof. Priya Murugan',
    designation: 'Deputy Warden (Girls Hostel)',
    role: 'warden',
    department: 'Electronics & Communication Engg',
    phone: '+91 98401 56789',
    address: 'Staff Quarters A-12, MSEC Residential Campus, Bangalore - 562157',
    emergency_contact: '+91 98401 56780',
    blood_group: 'B+',
    is_active: true,
    created_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 3,
    email: 'rahul.cse@msec.edu.in',
    full_name: 'Rahul Sharma',
    designation: 'Hostel Prefect (Resident)',
    role: 'student',
    register_number: '1ME21CS045',
    department: 'Computer Science & Engg',
    year_of_study: 3,
    phone: '+91 91234 56789',
    parent_name: 'Ramesh Sharma',
    parent_phone: '+91 94441 23456',
    address: 'Room 101, Kaveri Boys Block, MSEC Campus',
    emergency_contact: '+91 94441 99887',
    blood_group: 'O+',
    is_active: true,
    created_at: '2024-08-01T00:00:00Z',
  },
  {
    id: 4,
    email: 'accounts.hostel@msec.ac.in',
    full_name: 'Srikanth Verma',
    designation: 'Hostel Accounts & Estate Officer',
    role: 'admin',
    department: 'Hostel Finance & Estate Facilities',
    phone: '+91 98765 43210',
    address: 'Administrative Block Room 14, MSEC Campus',
    emergency_contact: '+91 98765 43200',
    blood_group: 'A+',
    is_active: true,
    created_at: '2023-06-01T00:00:00Z',
  },
];

interface AuthContextType {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  switchAccount: (account: User) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('msec_active_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.full_name) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return PRESET_ACCOUNTS[0];
  });

  const [isLoading] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('msec_active_user', JSON.stringify(user));
  }, [user]);

  const switchAccount = (account: User) => {
    setUser(account);
    localStorage.setItem('msec_active_user', JSON.stringify(account));
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('msec_active_user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    // Reset to primary Chief Warden account without showing login page
    setUser(PRESET_ACCOUNTS[0]);
    localStorage.setItem('msec_active_user', JSON.stringify(PRESET_ACCOUNTS[0]));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading,
        switchAccount,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
