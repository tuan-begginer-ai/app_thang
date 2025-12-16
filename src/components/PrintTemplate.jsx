import React, { forwardRef } from 'react';
import '../styles/PrintTemplate.css';
import logoImg from '../assets/logo-quoc-Binh-ena.png';
import chartImg from '../assets/dental-chart-static.png';
// import ToothChart from './ToothChart';

const PrintTemplate = forwardRef(({ data }, ref) => {
    return (
        <div className="print-template-container">
            <div className="paper-a5" ref={ref}>

                {/* Header Elements */}
                <img src={logoImg} className="a5-logo" alt="logo" />

                <div className="a5-company-name">CTY TNHH NHA KHOA</div>
                <div className="a5-quoc-binh">QUỐC BÌNH</div>
                <div className="a5-specialty">Khám chữa bệnh CK: RĂNG HÀM MẶT</div>

                <div className="a5-address-block">
                    CS1: 19 Phạm Hồng Thái, P.7, VT<br />
                    CS2: 28 Lê Lợi, P.4, Vũng Tàu<br />
                    CS3: 649 Trương Công Định, P.7, VT<br />
                    <span style={{ fontWeight: 700, color: '#2830CB' }}>GĐ-BS: Phan Quốc Bình</span>
                </div>

                <div className="a5-phone-block">
                    ĐT: 0254.3839966<br />
                    ĐT: 0254.3818318<br />
                    ĐT: 0708.649 649<br />
                    DĐ: 0914.839966
                </div>

                <div className="a5-chuyen-label">Chuyên:</div>
                <div className="a5-dac-biet-label">Đặc biệt:</div>

                <div className="a5-services-1">
                    - Trám - Nhổ răng - Lấy cao răng - Chữa răng và các bệnh răng miệng<br />
                    - Làm răng giả các loại - Chụp CT - X.Quang KTS - Răng hàm mặt
                </div>
                <div className="a5-services-2">
                    Cắm ghép (Implant) & Chỉnh răng kỹ thuật mới nhanh nhất<br />
                    Điều trị răng miệng, tẩy răng & Phẫu thuật bằng <span style={{ fontSize: '12px', color: '#E81E1E', fontWeight: 'bold' }}>Laser</span>
                </div>

                <div className="a5-web-contact">
                    Email: nhakhoaquocbinh@yahoo.com<br />
                    Website: www.nhakhoaquocbinh.com
                </div>

                <div className="a5-main-title">PHIẾU ĐIỀU TRỊ CS 1</div>

                {/* Form Lines - Flexbox for perfect alignment */}
                <div className="a5-form-left">
                    <div className="a5-line-row"><span className="a5-label">Họ và tên:</span><span className="a5-line"></span></div>
                    <div className="a5-line-row"><span className="a5-label">Địa chỉ:</span><span className="a5-line"></span></div>
                    <div className="a5-line-row"><span className="a5-label">Tiền sử bệnh:</span><span className="a5-line"></span></div>
                    <div className="a5-line-row"><span className="a5-label">Chẩn đoán:</span><span className="a5-line"></span></div>
                    <div className="a5-line-row"><span className="a5-label">Kế hoạch điều trị:</span><span className="a5-line"></span></div>
                    <div className="a5-line-full"></div>
                    <div className="a5-line-full"></div>
                    <div className="a5-line-full"></div>
                </div>

                <div className="a5-form-right">
                    Năm sinh: _____/_____/_______    Nam/nữ :<br />
                    ĐT: ______________ Nghề nghiệp: ____________
                </div>

                {/* Data Overlays - Adjusted for baseline alignment (matches DOB at 141px) */}
                <div className="field-overlay" style={{ top: '144px', left: '85px', width: '220px' }}>{data.name}</div>
                <div className="field-overlay" style={{ top: '165px', left: '70px', width: '230px' }}>{data.address}</div>
                <div className="field-overlay" style={{ top: '186px', left: '103px', width: '200px' }}>{data.history}</div>
                <div className="field-overlay" style={{ top: '206.5px', left: '90px', width: '210px', zIndex: 20 }}>{data.diagnosis}</div>
                {/* Keeping treatment slightly right to avoid overlap */}
                <div className="field-overlay" style={{
                    top: '226px',
                    left: '22px',
                    width: '269px',
                    whiteSpace: 'normal',
                    overflowWrap: 'break-word',
                    textIndent: '103px',
                    lineHeight: '21px'
                }}>{data.treatment}</div>

                {/* Right Block - DOB Split */}
                {(() => {
                    const dobParts = data.dob ? data.dob.split('/') : [];
                    // Fallback if user enters simple text or YYYY
                    const day = dobParts[0] || '';
                    const month = dobParts[1] || '';
                    const year = dobParts[2] || '';

                    if (dobParts.length < 2) {
                        // If not separated by slash, just show it in the first slot or handle differently?
                        // For now let's just dump it in first slot if standard parsing fails, or try hyphen
                        return <div className="field-overlay" style={{ top: '141px', left: '375px', width: '150px' }}>{data.dob}</div>;
                    }

                    return (
                        <>
                            <div className="field-overlay" style={{ top: '141px', left: '365px', width: '30px', textAlign: 'center' }}>{day}</div>
                            <div className="field-overlay" style={{ top: '141px', left: '400px', width: '30px', textAlign: 'center' }}>{month}</div>
                            <div className="field-overlay" style={{ top: '141px', left: '440px', width: '50px', textAlign: 'center' }}>{year}</div>
                        </>
                    );
                })()}

                <div className="field-overlay" style={{ top: '140px', left: '550px', width: '40px', fontSize: '12px' }}>
                    {data.gender}
                </div>

                {/* Keeping top fix for Phone/Occupation */}
                <div className="field-overlay" style={{ top: '156px', left: '335px', width: '100px' }}>{data.phone}</div>
                <div className="field-overlay" style={{ top: '156px', left: '495px', width: '100px' }}>{data.occupation}</div>


                {/* Dental Chart Labels */}
                <div style={{
                    position: 'absolute',
                    top: '175px',
                    left: '325px',
                    width: '120px',
                    textAlign: 'center',
                    fontFamily: 'Noticia Text',
                    fontWeight: '700',
                    fontSize: '9pt',
                    lineHeight: '1.2',
                    color: '#C35E33',
                    zIndex: 10
                }}>
                    RĂNG<br />VĨNH CỬU
                </div>
                <div style={{
                    position: 'absolute',
                    top: '175px',
                    left: '450px',
                    width: '120px',
                    textAlign: 'center',
                    fontFamily: 'Noticia Text',
                    fontWeight: '700',
                    fontSize: '9pt',
                    lineHeight: '1.2',
                    color: '#C35E33',
                    zIndex: 10
                }}>
                    RĂNG<br />SỮA
                </div>

                {/* Chart Box */}
                <div className="a5-chart-box">
                    <img
                        src={chartImg}
                        alt="Sơ đồ răng"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            mixBlendMode: 'multiply'
                        }}
                    />
                </div>

                {/* Footer Signature */}
                <div className="a5-footer-sig">
                    Vũng Tàu, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}<br />
                    <span style={{ fontWeight: 'bold' }}>BÁC SĨ KHÁM</span>
                    {/* Removed name, restored placeholder for stamp if needed or just empty space */}

                </div>

                {/* Slogan */}
                <div className="a5-slogan-container">
                    <div className="slogan-main">* CÓ ĐỨC CÓ TÂM - NGHĨA TÌNH</div>
                    <div className="slogan-sub">Rạng rỡ nụ cười - Sáng ngời sức khỏe</div>
                    <div className="slogan-hotline">Hotline: 0918 266 600</div>
                </div>

            </div>
        </div>
    );
});

export default PrintTemplate;
