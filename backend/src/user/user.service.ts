import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GAMES_SOCKET, status } from '../common/types';
import { Repository } from 'typeorm';
import { UserI, UserSafeInfo, UserSocket, MessageI, safeConv, safeRoom } from './models/user.interface';
import { User, Message, Conversation, GameData } from './models/user.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { GameService } from 'src/game/game.service';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		@InjectRepository(GameData)
		private gameRepository: Repository<GameData>,
		private httpService: HttpService,
	){}

	public connectedUser: UserSocket[] = [];

	// TWO FACTOR
	async setTwoFactorAuthenticationSecret(secret: string, userId: number) {
		return this.userRepository.update(userId, {
			twoFactorAuthenticationSecret: secret
		});
	}

	// TWO FACTOR ENABLE
	async turnOnTwoFactorAuthentication(userId: number) {
		const user: UserSocket = this.findConnectedUserById(userId)
		await this.userRepository.update(userId, {
			isTwoFactorAuthenticationEnabled: true
		});
		user.socket.emit('UPDATE_DB', await this.parseUserInfo(userId))
	}

	// TWO FACTOR DISABLE
	async turnOffTwoFactorAuthentication(userId: number) {
		const user: UserSocket = this.findConnectedUserById(userId)
		await this.userRepository.update(userId, {
			isTwoFactorAuthenticationEnabled: false
		});
		user.socket.emit('UPDATE_DB', await this.parseUserInfo(userId))
	}

	/*
		return list of user store in db
	*/
	findAll():Promise<UserI[]> {
		return this.userRepository.find();
	}

	/*
	return list of user store in db
	*/
	async getConnected():Promise<JSON> {
		let res:any = await Promise.all(this.connectedUser.map(async data => {
			let res = await this.parseUserInfo(data.id)
			return res
		}))
		return res
	}

	getById(id: number):Promise<UserI | undefined> {
		return this.userRepository.findOne({ where:{id: id} });
	}


	findOne(username: string):Promise<UserI | undefined> {
		return this.userRepository.findOne({ where:{username: username} });
	}

	findOneId(id: number):Promise<UserI | undefined> {
		return this.userRepository.findOne({ where:{id: id} });
	}

	findUserByIntra(intraID: number):Promise<UserI | undefined> {
		return this.userRepository.findOne({ where:{intraID:intraID} });
	}

	findUserByGoogleId(googleID: string):Promise<UserI | undefined> {
		return this.userRepository.findOne({ where:{googleID:googleID} });
	}

	findUserByDiscordId(discordID: string):Promise<UserI | undefined> {
		return this.userRepository.findOne({ where:{discordID:discordID} });
	}

	/*
	*/
	connectUser(data: {id:number,username:string,socket: any,status:status, gameID:string}) {
		let user = this.connectedUser.find((user: any) => {return user.id === data.id})
		if (!user){
			this.connectedUser.push({
				id:data.id,
				username:data.username,
				socket: data.socket,
				status:status.Connected,
				gameID:data.gameID,
				challenged:false
			})
		}
		console.log(data.username, "connected");
	}

	/*
	*/
	disconnectUser(socketID:number) {
		const user = this.connectedUser.find((user: any) => {return user.socket.id === socketID})
		if (user) {
			this.connectedUser.splice(this.connectedUser.findIndex(v => v.id === user.id), 1);
			user.socket.disconnect()
			console.log(user.username, "disconnected");
		}
	}

	/*
	*/
	findConnectedUserById(id:number) {
		const user = this.connectedUser.find((user: any) => {return user.id === id})
		if (user)
			return user;
		return null
	}

	/*
	*/
	findConnectedUserBySocketId(socketID:number):UserSocket {
		const user = this.connectedUser.find((user: any) => {return user.socket.id === socketID})
		if (user)
			return user;
		return null
	}
	/*
	*/
	findConnectedUserByUsername(username:string):UserSocket {
		const user = this.connectedUser.find((user: any) => {return user.username === username})
		if (user)
			return user;
		return null
	}

	/*
	*/
	getUserStatus(id:number):status {
		const user = this.connectedUser.find((user: any) => {return user.id === id})
		if (user)
			return user.status;
		return status.Disconnected
	}

	async editUsername(id:number, newUsername:string){
		const userRepo: User = await this.userRepository.findOne({ where:{id:id}})

		const isExist: User = await this.userRepository.findOne({ where:{username:newUsername}})
		if (isExist) {
			return -1;
		} else {
			if (userRepo.token42){
				let resp = await firstValueFrom(this.httpService
					.get(`https://api.intra.42.fr/v2/users?filter[login]=${newUsername}`, {
						headers: { Authorization: `Bearer ${userRepo.token42}` },
				}));
				let res = resp.data.find((user:any) => {
					return (user.login === newUsername && user.id !== userRepo.intraID)
				})
				if (res !== undefined)
					return -1
			}
			userRepo.username = newUsername
			await this.userRepository.save(userRepo)
			return 1
		}
	}

	async changePic(id:number, pathToPic:string){
		const userRepo: User = await this.userRepository.findOne({ where:{id:id}})
		const userSocket:UserSocket = this.findConnectedUserById(id);
		userRepo.profilPic = pathToPic
		await this.userRepository.save(userRepo)
		userSocket.socket.emit("UPDATE_DB", await this.parseUserInfo(id))
	}

	/*
	*/
	async updateUserDB(users:User[]) {
		for (let user of users){
			await this.userRepository
				.createQueryBuilder()
				.update(User)
				.set(user)
				.where("id = :id", { id: user.id })
				.execute();
		}
	}

	async saveGame(_game:GAMES_SOCKET){
		try {
			const usersRepo:User[] = await this.userRepository.find()
			let game = new GameData();
			game.users = _game.usersID.map(id => usersRepo.find(el => el.id == id))
			game.winner = _game.pong.getWinner().id
			game.duration = _game.pong.getDuration()
			game.maxSpeed = Math.ceil(_game.pong.getMaxBallSpeed())
			game.score = _game.pong.getScore()
			game.mode = _game.pong.getMode()
			await this.gameRepository.save(game)
		} catch(e){}
	}

	async getGameStatByUserId(userId:number):Promise<any>{
		const userRepo: User = await this.userRepository.findOne({ where:{id:userId}, relations: ['gameData', 'gameData.users']})
		return {
			gameStats:userRepo.gameData,
			username:userRepo.username,
			profilPic:userRepo.profilPic,
			lvl:userRepo.lvl,
			id:userRepo.id,
			status:this.getUserStatus(userRepo.id)
		};
	}

	async lvlUp(id:number){
		if (id >= 0){
			const userRepo: User = await this.userRepository.findOne({ where:{id:id}, relations: ['gameData', 'gameData.users']})
			let res = 0
			for (var i = userRepo.gameData.length - 1; i >= 0; i--) {
				let game = userRepo.gameData[i]
				if (game.winner === userRepo.id)
					res++;
				else
					break ;
			}
			if (res === userRepo.lvl + 1)
				userRepo.lvl++;
			await this.userRepository.save(userRepo)
		}
	}


	async getConversationByUserId(user:User):Promise<safeConv[]>{
		var _conv:safeConv[] = [];

		if (user){
			for (let conv of user.conversations) {
				_conv.push({
					id:conv.id,
					name:conv.name,
					msg:conv.messages,
					users:conv.users.map(user => ({id:user.id, username:user.username}))
				})
			}
		}
		return _conv;
	}

	async getRoomByUserId(user:User):Promise<safeRoom[]>{
		var _room:safeRoom[] = [];
		if (user){
			for (let room of user.rooms) {
				_room.push({
					id: room.id,
					ownerId: room.ownerId,
					adminId: room.adminId,
					bannedId: room.bannedId,
					name: room.name,
					password: room.password,
					users: room.users.map(user => ({id:user.id, username:user.username})),
					msg: room.messages,
					muted: room.muteds,
				})
			}
		}
		return _room;
	}
	/*
		return more readable user data for client
	*/
	async parseUserInfo(userID:number):Promise<UserSafeInfo> {
		const usersRepo:User[] = await this.userRepository.find()
		const userRepo: User = await this.userRepository.findOne({ where:{id:userID}, relations: [
			'conversations', 'conversations.messages', 'conversations.users', 'rooms', 'rooms.users', 'rooms.messages', 'rooms.muteds']})
		const userInfo:UserSocket = this.connectedUser.find((user: any) => {return user.id === userID})
		var UserSafeInfo:UserSafeInfo = {
			id: userRepo.id,
			lvl:userRepo.lvl,
			username: userRepo.username,
			status: userInfo ? userInfo.status : status.Disconnected,
			profilPic: userRepo.profilPic,
			gameID: userInfo ? userInfo.gameID : undefined,
			twoFactor: userRepo.isTwoFactorAuthenticationEnabled,
		};

		UserSafeInfo.friends = userRepo.friends.map(id => ({ id: id, username: usersRepo.find(el => el.id == id).username}));
		UserSafeInfo.blocked = userRepo.blocked.map(id => ({ id: id, username: usersRepo.find(el => el.id == id).username}));
		UserSafeInfo.friendsRequest = userRepo.friendsRequest.map(id => ({ id: id, username: usersRepo.find(el => el.id == id).username}));
		UserSafeInfo.pendingRequest = userRepo.pendingRequest.map(id => ({ id: id, username: usersRepo.find(el => el.id == id).username}));
		UserSafeInfo.conv = await this.getConversationByUserId(userRepo);
		UserSafeInfo.room = await this.getRoomByUserId(userRepo);
		return UserSafeInfo;
	}
}
