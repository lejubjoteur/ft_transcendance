import React, { useState, useEffect, useContext } from 'react'

// Components
import Home from './Home';
import Error404 from '../Error/Error404';

// Hooks
import {useDispatch, useSelector } from 'react-redux';
import { logout, updateDB, gameFound, gameEnd, spectate, challenged } from '../../../store/global/reducer';

//socket
import { SocketContext, socket} from '../../../context/socket';
import { Navigate, Routes, Route, useNavigate } from 'react-router-dom';
import Profile from './Profile';
import Popup from 'reactjs-popup'; 
import PopUpToaster from '../../commons/popup/PopUpToaster';
import Settings from './Settings';

// Types
import { status } from '../../../common/types'

type contact = {
		username:string,
		id:number,
		status:status,
}

const SocketConnection = (props:any) => {
	const socket = useContext(SocketContext);
	const dispatch = useDispatch();
	const global = useSelector((state: any) => state.global)
	const [popup, setPopup] = useState({open:false, error:true, message:""});
	const navigate = useNavigate();

	React.useEffect(() => {
		if (popup.open) {
			let msg = popup.message
			setTimeout(() => {
				if (msg === popup.message)
					setPopup(current => {return {open:false, error:true, message:""}})
			}, 2000);
		}
	}, [popup]);

	useEffect( () => {
		if (socket.connected === false)
			socket.connect()
			socket.on("connect", () => {
				socket.emit("CONNECT", {socketID: socket.id, id:global.id, username:global.username, jwt:global.token});
				socket.on("UPDATE_DB", (data) => {
					dispatch(updateDB(data))
				});
				socket.on("PopUp", (data) => {
					setPopup({open:true, error:data.error, message:data.message})
				});
				socket.on("disconnect", (data) => {
					dispatch(logout())
				});
				socket.on("GAME_FOUND", (data) => {
					navigate('/app')
					dispatch(gameFound(data))
				});
				socket.on("GAME_END", () => {
					dispatch(gameEnd())
				});
				socket.on("JOIN_SPECTATE", (data) => {
					dispatch(spectate(data.gameId))
				});
				socket.on("CHALLENGED", (data) => {
					dispatch(challenged(data))
				});
			});
		
		return () => {
			socket.off('connect')
			socket.off('disconnect')
			socket.off('CONNECT')
			socket.off('RECEIVE_REQUEST')
			socket.off("GAME_FOUND")
			socket.off("GAME_END")
			socket.off("PopUp")
			socket.off("UPDATE_DB")
			socket.off("JOIN_SPECTATE")
			socket.disconnect()
		};
	// eslint-disable-next-line
	}, []);

	// Getting Contact info for Profile Page
	const userContact: contact = {
		username : global.username,
		id : global.id,
		status : status.Connected,
	};
	document.title = "FT_TRANS "+ global.username;
	return (
		<>
			<Routes>
				<Route path="/" element={<Home/>}/>
				<Route path="/message" element={null}/>
				<Route path="/profile/*" element={<Profile contact={userContact}/>}/>
				<Route path="/settings" element={<Settings/>}/>
				<Route path="*" element={<Error404/>}/>
			</Routes>
			<Popup open={popup.open} contentStyle={{position:'absolute', bottom:48, left:0}}>
				<PopUpToaster content={popup.message} error={popup.error}/>
			</Popup>
		</>
	)
}

const Root = () => {
	const global = useSelector((state: any) => state.global)
	return (
		<>
			{global.logged ?
				<SocketContext.Provider value={socket}>
					<SocketConnection/>
				</SocketContext.Provider>
				:
				<Navigate to="/login" replace />
			}
		</>
	)
}

export default Root
