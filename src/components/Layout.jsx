import React from 'react';
import '../styles/Layout.css';

const Layout = ({ formSection, previewSection }) => {
    return (
        <div className="layout-container">
            <div className="layout-left">
                {formSection}
            </div>
            <div className="layout-right">
                {previewSection}
            </div>
        </div>
    );
};

export default Layout;
