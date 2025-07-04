import React, { useState } from 'react';
import Client from '../components/Client.js'
import Editor from '../components/Editor.js';

const EditorPage = () => {
  const [clients, setClients] = useState([
    { socketId: 1, username: 'vik' },
    { socketId: 2, username: 'khu' },

  ]);
  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="" src="/code-sync" alt="logo" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {
              clients.map((client) => (
                <Client
                  key={client.socketId}
                  username={client.username}
                />
              ))}
          </div>
        </div>
      <button className="btn copyBtn">Copy ROOM ID</button>
      <button className="btn leavebtn">Leave</button>
      </div>
      <div className="editorWrap">
        <Editor />
      </div>
    </div>
  );
};

export default EditorPage;
