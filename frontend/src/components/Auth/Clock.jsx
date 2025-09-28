// src/components/Auth/Clock.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Clock.css'; // optional extra styles
import { formatDateDMY, formatDateTimeIST } from '../../utils/date';

const Clock = ({ showDate = false }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center text-white font-mono">
      {showDate && (
        <div className="text-sm opacity-80">{formatDateDMY(time)}</div>
      )}
      <div className="text-lg font-semibold">{formatDateTimeIST(time).split(' ')[1]}</div>
    </div>
  );
};

Clock.propTypes = {
  showDate: PropTypes.bool,
};

export default Clock;
