import React from 'react'

// Components
import NavBar from '../../navbar/NavBar'
import ContactList from '../../contactList/ContactList';
import Footer from '../../commons/footer/Footer';

// CSS
import '../../../assets/fonts/fonts.css';

//Redux
import { useSelector } from 'react-redux';
import ChatBar from '../../message/chatBar';
import ChatRooms from '../../room/ChatRooms';
import RoomBar from '../../room/roomBar';
import Room from "../../room/index";
import Message from '../../message/FloatingMessage';

const Chat = () => {
	const global = useSelector((state: any) => state.global)
	return (
		<div className="w-full h-screen relative bg-slate-900">
			<NavBar/>
			<div className="absolute flex justify-between
							w-full top-[80px] sm:top-[112px] bottom-0 sm:bottom-[48px]">
				<div className="hidden w-full h-full flex sm:block justify-between bg-slate-700 z-50">
					<div className="relative h-[calc(100%-30px)] w-full flex justify-between bg-slate-700 ">
					<div className="relative h-[calc(100%-30px)] w-full flex justify-between bg-slate-700 ">
									<ChatRooms/>
									<RoomBar/>
									{global.roomID !== undefined && <Room/>}
							</div>
					
						<div className="relative flex-initial flex w-full bg-slate-800 sm:w-[400px] flex-col h-full">
							<ContactList/>
							{global.convID != undefined && <Message/>}
						</div>
					</div>
					<ChatBar/>
				</div>
			</div>
			<Footer/>
		</div>

	)
}

export default Chat
