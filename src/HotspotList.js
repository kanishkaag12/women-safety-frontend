// src/HotspotList.js

import React from 'react';

function HotspotList({ hotspots }) {
    return (
        <div className="hotspot-list">
            <h2>Hotspot Locations</h2>
            <ul>
                {hotspots.map((hotspot, index) => (
                    <li key={index}>{hotspot}</li>
                ))}
            </ul>
        </div>
    );
}

export default HotspotList;