import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from '../navigation/Sidebar';
import Navbar from '../navigation/Navbar';

function DashboardLayout() {
    const { sidebarOpen } = useSelector((state) => state.ui);

    return (
        <div className="min-h-screen bg-secondary-50">
            <Sidebar />
            <Navbar />

            <main
                className={`pt-16 min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'
                    }`}
            >
                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default DashboardLayout;
