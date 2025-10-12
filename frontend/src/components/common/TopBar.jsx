import React from 'react';
import PropTypes from 'prop-types';
import { FaHome } from 'react-icons/fa';

// Standard page top bar: left logo+title + actions; right Home button with right-side spacer for chat overlay.
export default function TopBar({
  logo = '🎯',
  title,
  actions = [],
  onHome,
  rightSpacerPx = 0, // fallback only; primary spacing comes from CSS var
}) {
  return (
    <div className="w-full" style={{ marginBottom: 12 }}>
      <div
        className="flex items-center justify-between w-full"
        style={{ gap: 8 }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <div style={{ fontSize: 22, lineHeight: 1 }}>{logo}</div>
          <h1 style={{ fontSize: 22, fontWeight: 'bold', margin: 0 }}>
            {title}
          </h1>
          <div className="flex flex-wrap" style={{ gap: 8, marginLeft: 12 }}>
            {actions.map((a) => (
              <button
                key={a.key || a.label}
                onClick={a.onClick}
                disabled={a.disabled}
                title={a.label}
                style={{
                  padding: '8px 12px',
                  background:
                    a.variant === 'warning'
                      ? '#ffc107'
                      : a.variant === 'info'
                      ? '#17a2b8'
                      : a.variant === 'primary'
                      ? '#007bff'
                      : a.variant === 'success'
                      ? '#28a745'
                      : '#6c757d',
                  color: a.variant === 'warning' ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: 4,
                  opacity: a.disabled ? 0.6 : 1,
                }}
              >
                {a.icon ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {a.icon}
                    <span>{a.label}</span>
                  </span>
                ) : (
                  a.label
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right side: reserve space for chat rail via CSS var; fallback to rightSpacerPx if needed */}
        <div
          className="flex items-center"
          style={{ gap: 8, marginRight: '2px' }}
        >
          <button
            title="Home"
            onClick={onHome}
            style={{
              padding: '8px 12px',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FaHome /> Home
          </button>
        </div>
      </div>
    </div>
  );
}

TopBar.propTypes = {
  logo: PropTypes.node,
  title: PropTypes.string.isRequired,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func,
      icon: PropTypes.node,
      variant: PropTypes.oneOf([
        'primary',
        'success',
        'warning',
        'info',
        'muted',
      ]),
      disabled: PropTypes.bool,
    }),
  ),
  onHome: PropTypes.func,
  rightSpacerPx: PropTypes.number,
};
