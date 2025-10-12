import React from 'react';
import PropTypes from 'prop-types';

const PageLayout = ({
  icon,
  title,
  children,
  actions,
  headerContent,
  card = true,
  contentClassName = '',
}) => {
  const handleHome = () => {
    window.dispatchEvent(new CustomEvent('app:home'));
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {icon ? (
            <span className="text-2xl text-indigo-700">{icon}</span>
          ) : null}
          {title ? <span className="text-lg font-bold">{title}</span> : null}
          {headerContent || null}
        </div>
        <div className="flex items-center gap-2">
          {actions || null}
          <button
            type="button"
            onClick={handleHome}
            className="rounded bg-gray-800 px-4 py-2 text-white transition hover:bg-gray-700"
          >
            🏠 Home
          </button>
        </div>
      </div>

      <div className="mt-4">
        {card ? (
          <div
            className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${contentClassName}`}
          >
            {children}
          </div>
        ) : (
          <div className={contentClassName}>{children}</div>
        )}
      </div>
    </div>
  );
};

PageLayout.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string,
  children: PropTypes.node,
  actions: PropTypes.node,
  headerContent: PropTypes.node,
  card: PropTypes.bool,
  contentClassName: PropTypes.string,
};

export default PageLayout;
