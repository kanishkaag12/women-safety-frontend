import React from 'react';
import './Dashboard.css';

const DashboardFooter = () => {
    const currentYear = new Date().getFullYear();
    
    return (
        <div className="dashboard-footer">
            <div className="footer-content">
                <p>&copy; {currentYear} Women Safety Project. All rights reserved.</p>
                <div className="footer-links">
                    <span>Emergency: 100</span>
                    <span>Women Helpline: 1091</span>
                    <span>Child Helpline: 1098</span>
                </div>
            </div>
        </div>
    );
};

export default DashboardFooter;
