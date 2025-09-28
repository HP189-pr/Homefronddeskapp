import React from 'react';
import menuActions from './menuActions.jsx';


const Topbar = ({ selectedMenuItem }) => {
  const getActions = menuActions[selectedMenuItem];
  const actions = typeof getActions === 'function' ? getActions() : [];

  return (
    <div className="bg-gray-100 shadow-md p-3 flex items-center gap-4 min-h-[5rem]">
      {selectedMenuItem &&
        actions.map((action, index) => (
          <button
            key={index} // Since actions are just emojis, index is safe to use.
            className="px-4 py-2 bg-gray-800 text-white rounded hover:text-gray-300 hover:bg-gray-700"
          >
            {action}
          </button>
        ))}
    </div>
  );
};

export default Topbar;
