import React, { useRef, useEffect } from 'react'
import { gamemode, GAME_STATUS } from '../../common/types'
import GameBar from './GameBar'

const Canvas = (props:any) => {
	const {height, width, game, ratio, username} = props
	const canvasRef = useRef<any>()
	const drawBall = (ctx:any) => {
		if (game.status === GAME_STATUS.RUNNING){
			for (const user of game.users){
				if (user.username === username) {
					ctx.fillStyle = '#22c55e'
					if (user.pos === "left" && game.ball.d.x < 0)
						ctx.fillStyle = '#8B5CF6'
					else if (user.pos === "right" && game.ball.d.x > 0)
						ctx.fillStyle = '#8B5CF6'
				}
			}
			ctx.beginPath()
			ctx.arc(game.ball.posx * ratio, game.ball.posy * ratio, game.ball.size * ratio, 0, 2*Math.PI)
			ctx.font = "16px Space Mono";
			ctx.fillText((game.ball.speed * 0.00026 / 0.025).toFixed(2) + "m/s", 5, 15);
			ctx.fill()
		}
	}
	const drawPlayers = (ctx:any) => {
		for (const user of game.users){
			ctx.fillStyle = '#22c55e'
			if (user.username === username) {
				ctx.fillStyle = '#8B5CF6'
			}
			ctx.fillRect(user.posx * ratio, user.posy * ratio, 5,  0.3 * height)
		}
		ctx.fillStyle = '#22c55e'
	}
	const drawStatus = (ctx:any) => {
		let textString;
		ctx.fillStyle = '#94a3b8'
		switch(game.status) {
			case(GAME_STATUS.COUNTDOWN):{
				ctx.font = "30px Pilowlava-Regular";
				textString = Math.ceil(game.countDown)
				ctx.fillText(textString, 
					width / 2 - ctx.measureText(textString).width / 2, 
					height / 2  + ctx.measureText(textString).width / 2);
				break;
			}
			case (GAME_STATUS.WINNER):{
				ctx.font = "30px Pilowlava-Regular";
				textString = "WINNER " + game.winner.username
				ctx.fillText(textString, 
					width / 2 - ctx.measureText(textString).width / 2, 
					height / 2 + ctx.measureText(textString).width / 2);
				break ;
			}
			case (GAME_STATUS.PAUSE):{
				ctx.font = "30px Pilowlava-Regular";
				textString = "PAUSE"
				ctx.fillText(textString, 
					width / 2 - ctx.measureText(textString).width / 2,
					height / 2 + ctx.measureText(textString).width / 2);
				break ;
			}
		}
	}
	useEffect(() => {
		const canvas = canvasRef.current
		const context = canvas.getContext('2d')
		let animationFrameId:any
		const render = () => {
			let textString;
			context.clearRect(0, 0, context.canvas.width, context.canvas.height)
			context.strokeStyle = "#22c55e";
			context.strokeRect(0, 0, width - 1, height - 1);
			drawBall(context)
			drawPlayers(context)
			drawStatus(context)
			if (game.mode === gamemode.boost){
				for (const user of game.users){
					for (const click of user.clickpos) {
						context.beginPath();
						context.arc(click.x * ratio, click.y * ratio, 5, 0, 2*Math.PI)
						context.strokeStyle = user.username === username ? '#8B5CF6' : '#22c55e'
						context.stroke();
					}
				}
			}
			context.font = "30px Space Mono";
			context.fillStyle = game.users[0].username === username ? '#8B5CF6' : '#22c55e'
			textString = game.users[0].point
			context.fillText(textString, width / 2 - context.measureText(textString).width/2 -20, 30);
			context.fillStyle = '#94a3b8'
			textString = " - "
			context.fillText(textString, width / 2 - context.measureText(textString).width/2, 30);
			context.fillStyle = game.users[1].username === username ? '#8B5CF6' : '#22c55e'
			textString = game.users[1].point
			context.fillText(textString, width / 2 - context.measureText(textString).width/2 + 20, 30);
		}
		render()
		
		return () => {
			window.cancelAnimationFrame(animationFrameId)
		}
	})
	return (
		<div>
			<div className='flex flex-col items-center justify-center w-full h-full'>
				<canvas style={{position:"relative"}} ref={canvasRef} width={width} height={height}/>
				<div className={`relative top-[-48px] w-full h-[48px]`}>
					<GameBar game={game}></GameBar>
				</div>
			</div>
		</div>
	)
}

export default Canvas