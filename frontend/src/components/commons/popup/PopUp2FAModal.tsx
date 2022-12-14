import React, {useEffect} from 'react'
import {useState} from 'react'
import { FiCheck, FiX } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import IconButton from '../buttons/IconButton';
import PopUpToaster from './PopUpToaster'
import Popup from 'reactjs-popup'; 
import Loading from '../utils/Loading';

type PopUp2FAModalProps = {
	closeFunc : () => void
}


function PopUp2FAModal({ closeFunc } : PopUp2FAModalProps) {
	const global = useSelector((state: any) => state.global)

	const [image, setInput] = useState({
		src: "",
		code: ""
	})

	const [popup, setPopup] = useState({open:false, error:true, message:""});
	React.useEffect(() => {
		if (popup.open) {
			setTimeout(() => {
				setPopup(current => {return {open:!current.open, error:true, message:""}})
			}, 2000);
		}
	  }, [popup]);

	useEffect(() => {
		generate()
		// eslint-disable-next-line
	}, []);


	const generate = () => {
		const requestOptions = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=utf-8',
				'Access-Control-Allow-Origin': '*',
				'Authorization': 'bearer ' + global.token,
			},
		}
		fetch(`${process.env.REACT_APP_BACK_IP}/2fa/generate`, requestOptions)
		.then(response =>
			response.blob()
		)
		.then(data => {
			const imageObjectURL = URL.createObjectURL(data);
			image.src = imageObjectURL
			setInput(image)
		})
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
		setInput({
			...image,
			[e.target.name]: e.target.value
		})
	}
	const sendCode = (event : any): void => {
		event.preventDefault(); // prevents render of component
		const requestOptions = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=utf-8',
				'Access-Control-Allow-Origin': '*',
				'Authorization': 'bearer ' + global.token,
			},
			body: JSON.stringify({
				code: image.code,
			})
		}
		fetch(`${process.env.REACT_APP_BACK_IP}/2fa/turn-on`, requestOptions).then(resp => {
			if (resp.ok)
			{	
				closeFunc()
			}
			else
			{	
				setPopup({open:true, error:true, message:"Wrong code!"})
			}
		})

		setInput({
			src: image.src,
			code: ""
		})
	}

	return ( 
		<div className="fixed left-0 top-0 w-full h-full bg-slate-900/50 z-50 
						flex items-center justify-center">
			<div className="
							relative
							w-[600px] p-[40px]
							bg-slate-800
							shadow-xl
							">
				<div className='absolute top-[8px] right-[8px]'>
					<IconButton onClick={ closeFunc } icon={FiX}/>
				</div>
				<h3 className='font-pilowlava text-[64px] text-transparent backgroundTextOutline'>
					Enable 2FA
				</h3>
				<p className='font-space text-[14px] text-slate-300'>
					Please flash the QR code below with Google Authentificator.
				</p>
				<div className='mt-[16px] mb-[16px]'>
					{
						image.src ? 
						<img src={image.src} style={{height:'240px', width:'240px'}} alt="" /> 
						: 
						<div className='flex items-center justify-center w-[240px] h-[240px]'>
							<Loading/>
						</div>
					}
				</div>
				<form className='relative w-[240px]' onSubmit={sendCode}>
					<input
						type="text"
						placeholder="Enter code here..."
						value={image.code}
						onChange={handleChange}
						name="code"
						className='	bg-transparent p-[8px] pl-[16px] w-[240px]
									border-b-[1px] border-slate-400 hover:border-slate-200 focus:border-transparent active:border-transparent
									font-space text-[16px] text-slate-200 placerholder:hover:text-slate-200 placeholder:text-slate-400
									transition-all duration-300 ease-in-out'
						
					/>
					<button
						type="submit"
						className="absolute right-[12px] bottom-[12px] text-slate-400 hover:text-slate-200 
									add-chat transition-all duration-300 ease-in-out"
					>
						<FiCheck></FiCheck>
					</button>
					
				</form>
			</div>
			<Popup open={popup.open} contentStyle={{position:'absolute', bottom:0, left:0}}>
				<PopUpToaster content={popup.message}/>
			</Popup>	
		</div>
	 );
}

export default PopUp2FAModal;