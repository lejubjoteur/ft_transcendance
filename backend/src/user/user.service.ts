import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GAME_STATUS, status } from 'src/common/types';
import { GameService } from 'src/game/game.service';
import { Repository, getConnection } from 'typeorm';
import { User, Message, Conversation } from './models/user.entity';
import { UserI, UserSafeInfo, UserSocket, safeConv } from './models/user.interface';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		@InjectRepository(Conversation)
		private convRepository: Repository<Conversation>,
		@InjectRepository(Message)
		private messageRepository: Repository<Message>,

	){}

	public connectedUser: UserSocket[] = [];

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
		return  res
	}

	/*
		find user by username
	*/
	findOne(username: string):Promise<UserI | undefined> {
		return this.userRepository.findOne({ username });
	}
	/*
		find user by username
	*/
	findUserByIntra(intraID: number):Promise<UserI | undefined> {
		return this.userRepository.findOne({ where:{intraID:intraID} });
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
				gameID:data.gameID
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

	/*
	*/
	async updateUserDB(users:User[]) {
		for (let user of users){
			await getConnection()
				.createQueryBuilder()
				.update(User)
				.set(user)
				.where("id = :id", { id: user.id })
				.execute();
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
	/*
		return more readable user data for client
	*/
	async parseUserInfo(userID:number):Promise<UserSafeInfo> {
		const usersRepo:User[] = await this.userRepository.find()
		const userRepo: User = await this.userRepository.findOne({ where:{id:userID}, relations: ['conversations', 'conversations.messages', 'conversations.users']})
		const userInfo:UserSocket = this.connectedUser.find((user: any) => {return user.id === userID})

		var UserSafeInfo:UserSafeInfo = {
			id: userRepo.id,
			username: userRepo.username,
			status: userInfo ? userInfo.status : status.Disconnected,
			profilIntraUrl: userRepo.profilIntraUrl,
			gameID: userInfo ? userInfo.gameID : undefined,

		};
		UserSafeInfo.friends = userRepo.friends.map(id => ({ id: id, username: usersRepo.find(el => el.id == id).username}));
		UserSafeInfo.bloqued = userRepo.bloqued.map(id => ({ id: id, username: usersRepo.find(el => el.id == id).username}));
		UserSafeInfo.friendsRequest = userRepo.friendsRequest.map(id => ({ id: id, username: usersRepo.find(el => el.id == id).username}));
		UserSafeInfo.conv = await this.getConversationByUserId(userRepo);
		return UserSafeInfo;
	}

}
