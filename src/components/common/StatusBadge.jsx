import React from 'react';

export default function StatusBadge({ status, label, size = 'md' }) {
  const getStyles = () => {
    switch (status) {
      case 'optimal':
      case 'resolved':
      case 'healthy':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          border: 'rgba(16, 185, 129, 0.3)',
          dot: '#10b981'
        };
      case 'warning':
      case 'medium':
      case 'in_progress':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: 'rgba(245, 158, 11, 0.3)',
          dot: '#f59e0b'
        };
      case 'critical':
      case 'high':
      case 'open':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          border: 'rgba(239, 68, 68, 0.3)',
          dot: '#ef4444'
        };
      case 'demo':
        return {
          bg: 'rgba(168, 85, 247, 0.15)',
          color: '#c084fc',
          border: 'rgba(168, 85, 247, 0.3)',
          dot: '#a855f7'
        };
      default:
        return {
          bg: 'rgba(56, 189, 248, 0.15)',
          color: '#38bdf8',
          border: 'rgba(56, 189, 248, 0.3)',
          dot: '#0284c7'
        };
    }
  };

  const style = getStyles();
  const displayLabel = label || status;
  const isSmall = size === 'sm';

  return (
    <span
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '5px' : '7px',
        padding: isSmall ? '2px 8px' : '4px 12px',
        borderRadius: '9999px',
        fontSize: isSmall ? '0.75rem' : '0.825rem',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        letterSpacing: '0.02em',
        textTransform: 'capitalize',
        userSelect: 'none'
      }}
    >
      <span
        style={{
          width: isSmall ? '6px' : '7px',
          height: isSmall ? '6px' : '7px',
          borderRadius: '50%',
          backgroundColor: style.dot,
          boxShadow: `0 0 6px ${style.dot}`
        }}
      />
      {displayLabel}
    </span>
  );
}
