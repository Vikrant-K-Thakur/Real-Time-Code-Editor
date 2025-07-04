import React, { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import {useNavigate} from 'react-router-dom'

const Home = () => {
    const navigate = useNavigate();

    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Created a new room')
    };

    const joinRoom = () => {
        if(!roomId || !username) {
            toast.error('ROOM ID and Username is required');
            return;
        }
        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        })
    };

    // if we hit Enter then it will send us to the editor page  
    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    }
    return (
        <div className="homePageWrapper">
            <div className="formWrapper">
                <div className="logoSection">
                    <div className="dnaIcon">🧬</div>
                    <h2 className="appTitle">Code sync</h2>
                    <p className="appSubtitle">Realtime collaboration</p>
                </div>
                <h4 className="mainLable">Paste invitation ROOM ID</h4>
                <div className="inputGroup">
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="ROOM ID"
                        onChange={(e) => setRoomId(e.target.value)}
                        value={roomId}
                        onKeyUp={handleInputEnter}
                    />
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="USERNAME"
                        onChange={(e) => setUsername(e.target.value)}
                        value={username}
                        onKeyUp={handleInputEnter}
                    />
                    <button className="btn joinBtn" onClick={joinRoom}>Join</button>
                    <span className="creareInfo">
                        If you don't have an invite then create &nbsp;
                        <a onClick={createNewRoom} href="/editor/new" className="createNewBtn">new room</a>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Home;