import React from 'react';
import '../styles/ToothChart.css';

// Adjusted coordinates for Side-by-Side layout
// Container width approx 500px.
// Adult: Left side (0-200), Baby: Right side (250-400)

const ADULT_TEETH = [
    // Top Right (18-11)
    { id: 18, x: 20, y: 40 }, { id: 17, x: 35, y: 35 }, { id: 16, x: 50, y: 30 }, { id: 15, x: 65, y: 30 },
    { id: 14, x: 80, y: 30 }, { id: 13, x: 95, y: 30 }, { id: 12, x: 110, y: 30 }, { id: 11, x: 125, y: 30 },
    // Top Left (21-28)
    { id: 21, x: 145, y: 30 }, { id: 22, x: 160, y: 30 }, { id: 23, x: 175, y: 30 }, { id: 24, x: 190, y: 30 },
    { id: 25, x: 205, y: 30 }, { id: 26, x: 220, y: 30 }, { id: 27, x: 235, y: 35 }, { id: 28, x: 250, y: 40 },

    // Bottom Left (31-38)
    { id: 31, x: 145, y: 110 }, { id: 32, x: 160, y: 110 }, { id: 33, x: 175, y: 110 }, { id: 34, x: 190, y: 110 },
    { id: 35, x: 205, y: 110 }, { id: 36, x: 220, y: 110 }, { id: 37, x: 235, y: 105 }, { id: 38, x: 250, y: 100 },
    // Bottom Right (41-48)
    { id: 48, x: 20, y: 100 }, { id: 47, x: 35, y: 105 }, { id: 46, x: 50, y: 110 }, { id: 45, x: 65, y: 110 },
    { id: 44, x: 80, y: 110 }, { id: 43, x: 95, y: 110 }, { id: 42, x: 110, y: 110 }, { id: 41, x: 125, y: 110 },
];

const BABY_TEETH = [
    // Top Right (55-51)
    { id: 55, x: 280, y: 50 }, { id: 54, x: 295, y: 45 }, { id: 53, x: 310, y: 45 }, { id: 52, x: 325, y: 45 }, { id: 51, x: 340, y: 45 },
    // Top Left (61-65)
    { id: 61, x: 360, y: 45 }, { id: 62, x: 375, y: 45 }, { id: 63, x: 390, y: 45 }, { id: 64, x: 405, y: 45 }, { id: 65, x: 420, y: 50 },
    // Bottom Left (71-75)
    { id: 71, x: 360, y: 95 }, { id: 72, x: 375, y: 95 }, { id: 73, x: 390, y: 95 }, { id: 74, x: 405, y: 95 }, { id: 75, x: 420, y: 90 },
    // Bottom Right (85-81)
    { id: 85, x: 280, y: 90 }, { id: 84, x: 295, y: 95 }, { id: 83, x: 310, y: 95 }, { id: 82, x: 325, y: 95 }, { id: 81, x: 340, y: 95 },
];

const Tooth = ({ id, x, y, status, onClick }) => {
    let fillColor = 'white';
    if (status === 'cavity') fillColor = '#ffdddd';
    if (status === 'missing') fillColor = '#eee';

    let strokeColor = '#333';
    if (status === 'cavity') strokeColor = 'red';

    return (
        <g onClick={() => onClick(id)} className="tooth-group">
            <circle cx={x} cy={y} r="6" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
            <text x={x} y={y - 9} fontSize="6" textAnchor="middle" fill="#555">{id}</text>
        </g>
    );
};

const ToothChart = ({ toothStatus, onToothClick }) => {
    return (
        <div className="tooth-chart-container">
            <div className="svg-wrapper">
                <svg viewBox="0 0 450 140" className="tooth-svg">
                    {/* Labels */}
                    <text x="135" y="15" fontSize="10" fill="#555" fontWeight="bold" textAnchor="middle">RĂNG VĨNH VIỄN</text>
                    <text x="350" y="25" fontSize="10" fill="#555" fontWeight="bold" textAnchor="middle">RĂNG SỮA</text>

                    {/* Vĩnh Viễn */}
                    {ADULT_TEETH.map((tooth) => (
                        <Tooth
                            key={tooth.id}
                            {...tooth}
                            status={toothStatus[tooth.id]}
                            onClick={onToothClick}
                        />
                    ))}

                    {/* Sữa */}
                    {BABY_TEETH.map((tooth) => (
                        <Tooth
                            key={tooth.id}
                            {...tooth}
                            status={toothStatus[tooth.id]}
                            onClick={onToothClick}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};

export default ToothChart;
