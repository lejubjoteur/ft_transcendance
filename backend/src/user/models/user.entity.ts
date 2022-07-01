import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	AfterLoad,
	AfterInsert,
	AfterUpdate,
	ManyToMany,
	JoinTable,
	OneToMany,
	ManyToOne
} from "typeorm";

@Entity()
export class User {

	@PrimaryGeneratedColumn()
	id:number;

	@Column()
	username:string;

	@Column("int", {nullable:true})
	intraID:number;

	@Column({nullable:true})
	profilIntraUrl:string;

	@Column("int", { array: true, default: '{}',nullable: true})
	friends: number[];

	@Column("int", { array: true, default: '{}',nullable: true })
	bloqued: number[];

	@Column("int", { array: true, default: '{}', nullable:true})
	friendsRequest: number[];

	@Column("int", { array: true, default: '{}', nullable:true})
	pendingRequest: number[];

	@ManyToMany(() => Conversation, conversation => conversation.users)
	conversations: Conversation[];

	@ManyToMany(() => GameData, GameData => GameData.users)
	gameData: GameData[];

	@AfterLoad()
	@AfterInsert()
	@AfterUpdate()
	async nullChecks():Promise<void> {
		if (!this.friendsRequest) {
			this.friendsRequest = []
		}
		if (!this.friends) {
			this.friends = []
		}
		if (!this.bloqued) {
			this.bloqued = []
		}
	}
}

@Entity()
export class Conversation {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(() => User, user => user.conversations)
	@JoinTable()
	users: User[];

	@OneToMany(() => Message, message => message.conversation, {cascade: ['insert', 'update']})
	messages: Message[];
}

@Entity()
export class GameData {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToMany(() => User, user => user.gameData)
	@JoinTable()
	users: User[];

	@Column()
	winner: number;

	@Column()
	duration: number;

	@Column()
	maxSpeed: number;

	@Column("int", { array: true, default: '{}', nullable:true})
	score: number[];
}

@Entity()
export class Message {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	idSend: number;

	@Column()
	author: string;

	@Column()
	content: string;

	@Column({nullable:true})
	date: string;

	@ManyToOne(() => Conversation, conversation => conversation.messages)
	conversation: Conversation;

}
