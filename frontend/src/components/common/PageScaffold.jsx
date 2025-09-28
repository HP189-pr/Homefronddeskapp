import React from 'react';
import PropTypes from 'prop-types';

// PageScaffold: Keeps a consistent structure and scrolling behavior for pages.
// Usage:
// <PageScaffold header={<TopBar .../>} form={<Form/>} records={<Table/>} />
export default function PageScaffold({ header, form, records }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header/top actions already provided by page via `header` */}
      <div className="shrink-0">{header}</div>
      {/* Form/entry area (auto height) */}
      <div className="shrink-0">{form}</div>
      {/* Records area: scrolls within remaining height */}
      <div className="flex-1 min-h-0 overflow-auto">{records}</div>
    </div>
  );
}

PageScaffold.propTypes = {
  header: PropTypes.node,
  form: PropTypes.node,
  records: PropTypes.node,
};
